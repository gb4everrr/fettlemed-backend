/**
 * profileAggregator.js
 * Fettlemed — Medical Context Object assembler
 *
 * Produces the Medical Context Object injected into the chat system prompt
 * and served to the Flutter Profile Screen via GET /api/profile/medical-summary.
 *
 * Source priority: clinic tables preferred, phr_* tables as fallback.
 * Identity: users.id (from JWT) = clinic_patient.global_patient_id = phr_*.patient_profile_id (fan-out).
 * Note: patient_profile.id is a separate PK and is NOT used anywhere in this file.
 * Hard exclusion: consultation_note.observations_private — never queried, never returned.
 * Token target: 600–800 tokens across all layers.
 */

'use strict';

const { Op } = require('sequelize');

/**
 * Resolves all clinic_patient IDs linked to a global patient.
 * Must be called before any clinic-side query.
 *
 * @param {object} models - Sequelize models
 * @param {number} userId - users.id from JWT (= clinic_patient.global_patient_id)
 * @returns {number[]} Array of clinic_patient.id values (may be empty)
 */
async function resolveClinicPatientIds(models, userId) {
  const links = await models.ClinicPatient.findAll({
    where: { global_patient_id: userId },
    attributes: ['id'],
    raw: true,
  });
  return links.map((r) => r.id);
}

/**
 * Layer 1 — Static Profile (~150 tokens)
 * Demographics, allergies, active diagnoses, active medications.
 * All fields are relevant to any query — always included.
 *
 * Cache policy: Redis keyed by patient_profile_id.
 * Invalidate on any new PHR write or clinic record creation for this patient.
 */
async function buildLayer1(models, userId, patientProfileId, clinicPatientIds) {
  // ── Demographics ──────────────────────────────────────────────────────────
  // first_name/last_name live on users; dob/gender/blood_type on patient_profile.
  // userId used for the join; patientProfileId used for PHR queries below.
  const profileRow = await models.PatientProfile.findOne({
    where: { id: patientProfileId },
    attributes: ['date_of_birth', 'gender', 'blood_type'],
    include: [{
      model: models.User,
      as: 'user',
      attributes: ['first_name', 'last_name'],
    }],
  });
  const profile = profileRow ? {
    first_name: profileRow.user?.first_name || null,
    last_name:  profileRow.user?.last_name  || null,
    date_of_birth: profileRow.date_of_birth,
    gender:     profileRow.gender,
    blood_type: profileRow.blood_type,
  } : null;

  // ── Allergies ─────────────────────────────────────────────────────────────
  // Never truncated — a missed allergy is a critical failure.
  let allergies = [];
  if (clinicPatientIds.length > 0) {
    const rows = await models.PatientAllergy.findAll({
      where: { clinic_patient_id: { [Op.in]: clinicPatientIds } },
      attributes: ['allergy_name', 'severity', 'reaction'],
      raw: true,
    });
    allergies = rows.map((r) => ({
      name: r.allergy_name,
      severity: r.severity,
      reaction: r.reaction || null,
    }));
  }

  // ── Active Diagnoses ──────────────────────────────────────────────────────
  // Clinic source only (is_active = true, type = Confirmed preferred).
  let diagnoses = [];
  if (clinicPatientIds.length > 0) {
    const rows = await models.AppointmentDiagnosis.findAll({
      where: {
        clinic_patient_id: { [Op.in]: clinicPatientIds },
        is_active: true,
      },
      attributes: ['description', 'code', 'type', 'created_at'],
      order: [['created_at', 'DESC']],
      raw: true,
    });
    diagnoses = rows.map((r) => ({
      description: r.description,
      code: r.code || null,
      type: r.type || 'Provisional',
    }));
  }

  // ── Active Medications ────────────────────────────────────────────────────
  // Clinic source preferred (is_active = true).
  // PHR fallback: phr_medications from last 6 months if no clinic prescriptions found.
  let medications = [];
  let medicationSource = 'clinic';

  if (clinicPatientIds.length > 0) {
    const rows = await models.Prescription.findAll({
      where: {
        clinic_patient_id: { [Op.in]: clinicPatientIds },
        is_active: true,
      },
      attributes: ['drug_name', 'dose', 'frequency'],
      order: [['created_at', 'DESC']],
      raw: true,
    });
    medications = rows.map((r) => ({
      name: r.drug_name,
      dose: r.dose || null,
      frequency: r.frequency || null,
      source: 'clinic',
    }));
  }

  if (medications.length === 0) {
    // PHR fallback — last 6 months, no active/ended label (deferred per handover)
    medicationSource = 'phr';
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const rows = await models.PhrMedication.findAll({
      where: {
        patient_profile_id: patientProfileId,
        prescribed_at: { [Op.gte]: sixMonthsAgo },
      },
      attributes: ['medication_name', 'dosage', 'frequency', 'prescribed_at'],
      order: [['prescribed_at', 'DESC']],
      raw: true,
    });
    medications = rows.map((r) => ({
      name: r.medication_name,
      dose: r.dosage || null,
      frequency: r.frequency || null,
      source: 'phr',
    }));
  }

  return {
    patient: profile
      ? {
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          dob: profile.date_of_birth,
          gender: profile.gender,
          blood_type: profile.blood_type || null,
        }
      : null,
    allergies,
    diagnoses,
    medications,
  };
}

/**
 * Layer 2 — General Context (~200 tokens)
 * Recent vitals (snapshot + trend), last 3 encounters, last 2 consultation notes.
 *
 * Cache policy: Redis keyed by patient_profile_id, TTL 10 minutes.
 * Also invalidate on new record insertion.
 *
 * Hard exclusion: consultation_note.observations_private — excluded at query level.
 */
async function buildLayer2(models, patientProfileId, clinicPatientIds) {
  // ── Vitals ────────────────────────────────────────────────────────────────
  // Two tiers with different merge strategies:
  //
  //   SNAPSHOT vitals (latest value + date only):
  //     heart rate, blood pressure, spo2, temperature, weight, height, bmi, respiratory rate
  //     Strategy: clinic source wins. PHR fallback only if clinic has nothing for that type.
  //     Rationale: single latest value — clinic is more trustworthy, deduplication
  //     across sources adds complexity with minimal benefit.
  //
  //   TREND vitals (last 3 readings with dates):
  //     hba1c, fasting glucose, creatinine, egfr, ldl, hdl,
  //     total cholesterol, platelets, haemoglobin
  //     Strategy: MERGE clinic + PHR, deduplicate by date, clinic wins on collision.
  //     Rationale: longitudinal data matters. A patient may have clinic HbA1c readings
  //     AND uploaded lab reports — source-priority would silently drop valid history.

  const SNAPSHOT_VITALS = new Set([
    'heart rate', 'blood pressure', 'spo2', 'temperature',
    'weight', 'height', 'bmi', 'respiratory rate',
  ]);
  const TREND_VITALS = new Set([
    'hba1c', 'fasting glucose', 'creatinine', 'egfr',
    'ldl', 'hdl', 'total cholesterol', 'platelets', 'haemoglobin',
  ]);

  const vitalsSnapshot = [];
  const vitalsTrend = [];

  // ── Step 1: Fetch ALL clinic vitals ───────────────────────────────────────
  // Keyed by normalised vital name → array of readings (DESC by date).
  const clinicByName = {}; // { normName: [{ value, unit, date, source }] }

  if (clinicPatientIds.length > 0) {
    const entries = await models.VitalsEntry.findAll({
      where: { clinic_patient_id: { [Op.in]: clinicPatientIds } },
      attributes: ['id', 'entry_date'],
      order: [['entry_date', 'DESC']],
      include: [
        {
          model: models.VitalsRecordedValue,
          as: 'values',
          attributes: ['vital_value'],
          include: [
            {
              model: models.ClinicVitalConfig,
              as: 'config',
              attributes: ['vital_name', 'unit'],
              where: { is_active: true },
            },
          ],
        },
      ],
    });

    for (const entry of entries) {
      for (const val of entry.values) {
        const normName = val.config.vital_name.toLowerCase().trim();
        if (!clinicByName[normName]) clinicByName[normName] = [];
        clinicByName[normName].push({
          value: val.vital_value,
          unit: val.config.unit || null,
          date: entry.entry_date,
          source: 'clinic',
        });
      }
    }
  }

  // ── Step 2: Fetch ALL phr vitals for tracked types ────────────────────────
  // Always fetch for all tracked vital types — not just missing ones.
  // Snapshot PHR is only used as fallback (below), but trend PHR is always merged.
  const allTrackedVitals = [...SNAPSHOT_VITALS, ...TREND_VITALS];
  const phrByName = {}; // { normName: [{ value, unit, date, source }] }

  const phrRows = await models.PhrVital.findAll({
    where: {
      patient_profile_id: patientProfileId,
      vital_name: { [Op.in]: allTrackedVitals },
    },
    attributes: ['vital_name', 'vital_value', 'unit', 'recorded_at'],
    order: [['recorded_at', 'DESC']],
    raw: true,
  });

  for (const row of phrRows) {
    const normName = row.vital_name.toLowerCase().trim();
    if (!phrByName[normName]) phrByName[normName] = [];
    phrByName[normName].push({
      value: row.vital_value,
      unit: row.unit || null,
      date: row.recorded_at,
      source: 'phr',
    });
  }

  // ── Step 3: Build snapshot vitals (clinic-priority, PHR fallback) ─────────
  for (const normName of SNAPSHOT_VITALS) {
    const clinicReadings = clinicByName[normName];
    const phrReadings = phrByName[normName];

    // Clinic wins if present — take the single latest reading.
    if (clinicReadings && clinicReadings.length > 0) {
      const latest = clinicReadings[0]; // already DESC
      vitalsSnapshot.push({
        name: normName,
        value: latest.value,
        unit: latest.unit,
        date: latest.date,
        source: 'clinic',
      });
    } else if (phrReadings && phrReadings.length > 0) {
      // PHR fallback — clinic had nothing for this vital type.
      const latest = phrReadings[0];
      vitalsSnapshot.push({
        name: normName,
        value: latest.value,
        unit: latest.unit,
        date: latest.date,
        source: 'phr',
      });
    }
    // If neither source has data, omit — don't push a null entry.
  }

  // ── Step 4: Build trend vitals (merge clinic + PHR, dedup by date) ────────
  for (const normName of TREND_VITALS) {
    const clinicReadings = clinicByName[normName] || [];
    const phrReadings = phrByName[normName] || [];

    if (clinicReadings.length === 0 && phrReadings.length === 0) continue;

    // Merge both arrays.
    const merged = [...clinicReadings, ...phrReadings];

    // Deduplicate by date string — clinic wins on collision (clinic is first in merged).
    const seenDates = new Set();
    const deduped = [];
    for (const r of merged) {
      // Normalise date to YYYY-MM-DD string for comparison.
      const dateKey = new Date(r.date).toISOString().slice(0, 10);
      if (seenDates.has(dateKey)) continue; // clinic entry already claimed this date
      seenDates.add(dateKey);
      deduped.push(r);
    }

    // Sort DESC by date and take last 3.
    deduped.sort((a, b) => new Date(b.date) - new Date(a.date));
    const top3 = deduped.slice(0, 3);

    // Determine source label for the merged set.
    const hasClinic = top3.some((r) => r.source === 'clinic');
    const hasPhr = top3.some((r) => r.source === 'phr');
    const sourceLabel = hasClinic && hasPhr ? 'mixed' : hasClinic ? 'clinic' : 'phr';

    vitalsTrend.push({
      name: normName,
      readings: top3.map((r) => ({
        value: r.value,
        unit: r.unit,
        date: r.date,
        source: r.source, // per-reading source retained for traceability
      })),
      source: sourceLabel,
    });
  }

  // ── Encounters ────────────────────────────────────────────────────────────
  // Last 3 from phr_encounters (PHR only — no clinic-side encounter table).
  const encounterRows = await models.PhrEncounter.findAll({
    where: { patient_profile_id: patientProfileId },
    attributes: [
      'reason_for_visit',
      'discharge_date',
      'followup_instructions',
      'attending_doctor',
      'admission_date',
    ],
    order: [['admission_date', 'DESC']],
    limit: 3,
    raw: true,
  });

  const encounters = encounterRows.map((r) => ({
    reason: r.reason_for_visit || null,
    date: r.discharge_date || r.admission_date || null,
    followup: r.followup_instructions || null,
    doctor: r.attending_doctor || null,
  }));

  // ── Consultation Notes ────────────────────────────────────────────────────
  // Last 2 from clinic source.
  // HARD EXCLUSION: observations_private is NOT in the attributes list.
  let consultations = [];
  if (clinicPatientIds.length > 0) {
    const noteRows = await models.ConsultationNote.findAll({
      where: { clinic_patient_id: { [Op.in]: clinicPatientIds } },
      // observations_private intentionally omitted
      attributes: ['subjective', 'objective', 'diagnosis_comments', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 2,
      raw: true,
    });

    consultations = noteRows.map((r) => ({
      date: r.created_at,
      subjective: r.subjective || null,
      objective: r.objective || null,
      diagnosis_comments: r.diagnosis_comments || null,
    }));
  }

  // ── Imaging ───────────────────────────────────────────────────────────────
  // Most recent report per body part. Impression only (global/profile mode).
  // PHR source only — no clinic-side imaging table in schema.
  const imagingRows = await models.PhrImagingReport.findAll({
    where: { patient_profile_id: patientProfileId },
    attributes: ['body_part', 'modality', 'impression', 'report_date', 'id'],
    order: [['report_date', 'DESC']],
    raw: true,
  });

  // Deduplicate: keep only the most recent report per body_part.
  // Rows are already DESC so first occurrence of each body_part wins.
  const seenBodyParts = new Set();
  const imaging = [];
  for (const row of imagingRows) {
    const key = (row.body_part || '').toLowerCase().trim();
    if (seenBodyParts.has(key)) continue;
    seenBodyParts.add(key);
    imaging.push({
      body_part: row.body_part || null,
      modality: row.modality || null,
      impression: row.impression || null,
      date: row.report_date || null,
      upload_id: row.id, // retained for Flutter deep-linking
    });
  }

  return {
    vitals: {
      snapshot: vitalsSnapshot,
      trend: vitalsTrend,
    },
    encounters,
    consultations,
    imaging,
  };
}

/**
 * buildMedicalContextObject
 * Top-level assembler. Resolves identity, builds Layer 1 + Layer 2,
 * and returns the full Medical Context Object.
 *
 * Layer 3 (query-scoped) is assembled per chat turn inside the chat controller,
 * not here — this function covers the cached layers only.
 *
 * @param {object} models - Sequelize models map
 * @param {number} userId - users.id from JWT
 * @returns {object} Medical Context Object
 */
async function buildMedicalContextObject(models, userId) {
  // Step 1: Resolve both identity values needed downstream.
  //   userId           → clinic_patient.global_patient_id  (clinic fan-out)
  //   patientProfileId → phr_*.patient_profile_id          (PHR queries)
  const profileRow = await models.PatientProfile.findOne({
    where: { user_id: userId },
    attributes: ['id'],
    raw: true,
  });
  if (!profileRow) throw new Error(`No patient_profile found for user_id=${userId}`);
  const patientProfileId = profileRow.id;

  // Step 2: Resolve all clinic_patient IDs for this user (uses userId directly).
  const clinicPatientIds = await resolveClinicPatientIds(models, userId);

  // Step 3: Build both layers in parallel — they have no interdependency.
  const [layer1, layer2] = await Promise.all([
    buildLayer1(models, userId, patientProfileId, clinicPatientIds),
    buildLayer2(models, patientProfileId, clinicPatientIds),
  ]);

  return {
    patient: layer1.patient,
    allergies: layer1.allergies,
    diagnoses: layer1.diagnoses,
    medications: layer1.medications,
    vitals: layer2.vitals,
    encounters: layer2.encounters,
    consultations: layer2.consultations,
    imaging: layer2.imaging,
  };
}

module.exports = { buildMedicalContextObject, resolveClinicPatientIds };