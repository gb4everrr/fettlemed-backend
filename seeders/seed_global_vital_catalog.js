'use strict';

/**
 * Seeder: global_vital_catalog
 *
 * Source: Vitals_Preload.csv
 *
 * Naming convention:
 *   - If Subclass/Type is meaningful (not "Standard", "Auto-calc", "POC Test"),
 *     vital_name = "Vital Name (Subclass)" e.g. "Blood Pressure (Systolic)"
 *   - Otherwise vital_name = "Vital Name" e.g. "Respiratory Rate"
 *
 * data_type mapping from CSV:
 *   Decimal  → 'number'
 *   Integer  → 'number'
 *   String   → 'text'
 *   Boolean  → 'boolean'
 *   Date     → 'date'
 *
 * min/max: Parsed from the last CSV column where format is "min-max".
 *   Rows with non-numeric or date-like ranges (e.g. "May-90") are stored as NULL.
 */

// Subclass values that are purely descriptive and should NOT be appended to the name
const SKIP_SUBCLASS = new Set([
  'Standard',
  'Auto-calc',
  'POC Test',
  'Pediatric',   // kept descriptive in notes instead
]);

function buildName(vitalName, subclass) {
  if (!subclass || SKIP_SUBCLASS.has(subclass)) return vitalName;
  return `${vitalName} (${subclass})`;
}

function mapDataType(csvType) {
  switch (csvType?.trim().toLowerCase()) {
    case 'decimal':
    case 'integer': return 'number';
    case 'string':  return 'text';
    case 'boolean': return 'boolean';
    case 'date':    return 'date';
    default:        return 'text';
  }
}

/**
 * Parses "min-max" strings like "40-300", "0.5-400", "3.0-17.0".
 * Returns { min, max } or { min: null, max: null } if not parseable.
 * Skips Excel-mangled date ranges like "May-90", "Jan-20", "Oct-80".
 */
function parseMinMax(raw) {
  if (!raw || raw === 'NA') return { min_value: null, max_value: null };

  // Reject anything that looks like an Excel-interpreted date (e.g. "May-90")
  if (/^[A-Za-z]/.test(raw)) return { min_value: null, max_value: null };

  const parts = raw.split('-');
  if (parts.length !== 2) return { min_value: null, max_value: null };

  const min = parseFloat(parts[0]);
  const max = parseFloat(parts[1]);

  if (isNaN(min) || isNaN(max)) return { min_value: null, max_value: null };
  return { min_value: min, max_value: max };
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const vitals = [
      // ── Anthropometrics ─────────────────────────────────────────────────────
      { category: 'Anthropometrics', vital_name: buildName('Height', 'Standing'),               unit: 'cm',       data_type: 'number',  notes: 'Standard height',                      ...parseMinMax('15-300') },
      { category: 'Anthropometrics', vital_name: buildName('Recumbent Length', 'Pediatric'),    unit: 'cm',       data_type: 'number',  notes: 'For infants <2 years',                 ...parseMinMax('35-100') },
      { category: 'Anthropometrics', vital_name: buildName('Weight', null),                     unit: 'kg',       data_type: 'number',  notes: null,                                   ...parseMinMax('0.4-700') },
      { category: 'Anthropometrics', vital_name: buildName('Body Mass Index (BMI)', null),      unit: 'kg/m²',    data_type: 'number',  notes: 'Formula: Weight / (Height/100)²',      ...parseMinMax(null) },
      { category: 'Anthropometrics', vital_name: buildName('Waist Circumference', null),        unit: 'cm',       data_type: 'number',  notes: null,                                   ...parseMinMax('10-300') },
      { category: 'Anthropometrics', vital_name: buildName('Hip Circumference', null),          unit: 'cm',       data_type: 'number',  notes: null,                                   ...parseMinMax('30-300') },
      { category: 'Anthropometrics', vital_name: buildName('Waist–Hip Ratio', null),            unit: 'Ratio',    data_type: 'number',  notes: 'Formula: Waist / Hip',                 ...parseMinMax('0.40-1.5') },
      { category: 'Anthropometrics', vital_name: buildName('Neck Circumference', null),         unit: 'cm',       data_type: 'number',  notes: 'Sleep apnea screening',                ...parseMinMax(null) },
      { category: 'Anthropometrics', vital_name: buildName('Mid-Upper Arm Circumference', 'MUAC'), unit: 'cm',   data_type: 'number',  notes: 'Malnutrition screening',               ...parseMinMax(null) },
      { category: 'Anthropometrics', vital_name: buildName('Head Circumference', 'Pediatric'),  unit: 'cm',       data_type: 'number',  notes: 'Infant growth tracking',               ...parseMinMax('20-100') },
      { category: 'Anthropometrics', vital_name: buildName('Body Fat Percentage', null),        unit: '%',        data_type: 'number',  notes: null,                                   ...parseMinMax(null) },
      { category: 'Anthropometrics', vital_name: buildName('Lean Muscle Mass', null),           unit: 'kg',       data_type: 'number',  notes: null,                                   ...parseMinMax('0.5-400') },
      { category: 'Anthropometrics', vital_name: buildName('Basal Metabolic Rate (BMR)', null), unit: 'kcal/day', data_type: 'number',  notes: 'Mifflin-St Jeor Equation',             ...parseMinMax('500-10000') },
      { category: 'Anthropometrics', vital_name: buildName('Growth Percentile', 'Height/Weight'), unit: '%',      data_type: 'number',  notes: 'WHO/CDC Reference',                    ...parseMinMax('0-100') },

      // ── Hemodynamics ─────────────────────────────────────────────────────────
      { category: 'Hemodynamics', vital_name: buildName('Blood Pressure', 'Systolic'),              unit: 'mmHg',    data_type: 'number',  notes: 'Top number',                           ...parseMinMax('40-300') },
      { category: 'Hemodynamics', vital_name: buildName('Blood Pressure', 'Diastolic'),             unit: 'mmHg',    data_type: 'number',  notes: 'Bottom number',                        ...parseMinMax('20-120') },
      { category: 'Hemodynamics', vital_name: buildName('Mean Arterial Pressure (MAP)', null),      unit: 'mmHg',    data_type: 'number',  notes: 'Formula: (2×Diastolic + Systolic) / 3', ...parseMinMax('30-200') },
      { category: 'Hemodynamics', vital_name: buildName('Orthostatic BP (Lying)', 'Systolic'),      unit: 'mmHg',    data_type: 'number',  notes: null,                                   ...parseMinMax('30-300') },
      { category: 'Hemodynamics', vital_name: buildName('Orthostatic BP (Sitting)', 'Systolic'),    unit: 'mmHg',    data_type: 'number',  notes: null,                                   ...parseMinMax('40-300') },
      { category: 'Hemodynamics', vital_name: buildName('Orthostatic BP (Standing)', 'Systolic'),   unit: 'mmHg',    data_type: 'number',  notes: null,                                   ...parseMinMax('30-300') },
      { category: 'Hemodynamics', vital_name: buildName('Heart Rate', 'Resting (Auscultated)'),     unit: 'bpm',     data_type: 'number',  notes: 'Heard via stethoscope',                ...parseMinMax('40-190') },
      { category: 'Hemodynamics', vital_name: buildName('Pulse Rate', 'Peripheral (Palpated)'),     unit: 'bpm',     data_type: 'number',  notes: 'Felt at wrist/neck',                   ...parseMinMax('20-300') },
      { category: 'Hemodynamics', vital_name: buildName('Pulse Rhythm', null),                      unit: null,      data_type: 'text',    notes: 'Regular / Irregular / Irregularly Irregular', ...parseMinMax('NA') },
      { category: 'Hemodynamics', vital_name: buildName('Capillary Refill Time', null),             unit: 'Seconds', data_type: 'number',  notes: 'Normal < 2s',                          ...parseMinMax('0-20') },

      // ── Respiratory ──────────────────────────────────────────────────────────
      { category: 'Respiratory', vital_name: buildName('Respiratory Rate', null),                   unit: 'breaths/min', data_type: 'number', notes: null,                              ...parseMinMax(null) },
      { category: 'Respiratory', vital_name: buildName('Oxygen Saturation (SpO₂)', 'Room Air'),     unit: '%',           data_type: 'number', notes: null,                              ...parseMinMax('85-100') },
      { category: 'Respiratory', vital_name: buildName('Oxygen Saturation (SpO₂)', 'On Oxygen'),    unit: '%',           data_type: 'number', notes: null,                              ...parseMinMax('0-100') },
      { category: 'Respiratory', vital_name: buildName('O₂ Flow Rate', 'Supplemental'),             unit: 'L/min',       data_type: 'number', notes: null,                              ...parseMinMax('0-60') },
      { category: 'Respiratory', vital_name: buildName('Peak Expiratory Flow (PEFR)', null),        unit: 'L/min',       data_type: 'number', notes: 'Asthma monitoring',               ...parseMinMax('20-900') },
      { category: 'Respiratory', vital_name: buildName('End-Tidal CO₂ (EtCO₂)', null),             unit: 'mmHg',        data_type: 'number', notes: 'Capnography',                     ...parseMinMax(null) },

      // ── Neurology ────────────────────────────────────────────────────────────
      { category: 'Neurology', vital_name: buildName('AVPU Scale', null),                           unit: 'Scale',   data_type: 'text',    notes: 'Alert / Voice / Pain / Unresponsive', ...parseMinMax('NA') },
      { category: 'Neurology', vital_name: buildName('Glasgow Coma Scale (GCS)', 'Total Score'),    unit: 'Score',   data_type: 'number',  notes: 'Range 3–15',                          ...parseMinMax('3-15') },
      { category: 'Neurology', vital_name: buildName('Pupil Size', 'Right'),                        unit: 'mm',      data_type: 'number',  notes: null,                                  ...parseMinMax('1-9') },
      { category: 'Neurology', vital_name: buildName('Pupil Reaction', 'Right'),                    unit: 'Response',data_type: 'text',    notes: 'Reactive / Sluggish / Fixed',         ...parseMinMax('NA') },
      { category: 'Neurology', vital_name: buildName('Pupil Size', 'Left'),                         unit: 'mm',      data_type: 'number',  notes: null,                                  ...parseMinMax('2-8') },
      { category: 'Neurology', vital_name: buildName('Pupil Reaction', 'Left'),                     unit: 'Response',data_type: 'text',    notes: 'Reactive / Sluggish / Fixed',         ...parseMinMax('NA') },
      { category: 'Neurology', vital_name: buildName('Pain Score', 'Numeric Rating Scale'),         unit: 'Score',   data_type: 'number',  notes: '0–10',                                ...parseMinMax('0-10') },

      // ── Metabolic ────────────────────────────────────────────────────────────
      { category: 'Metabolic', vital_name: buildName('Body Temperature', 'Oral'),                   unit: '°C',      data_type: 'number',  notes: null,                                  ...parseMinMax('35.0-42.0') },
      { category: 'Metabolic', vital_name: buildName('Body Temperature', 'Axillary'),               unit: '°C',      data_type: 'number',  notes: null,                                  ...parseMinMax('32.0-43.0') },
      { category: 'Metabolic', vital_name: buildName('Body Temperature', 'Rectal'),                 unit: '°C',      data_type: 'number',  notes: null,                                  ...parseMinMax('34.0-42.0') },
      { category: 'Metabolic', vital_name: buildName('Blood Glucose', 'Random'),                    unit: 'mg/dL',   data_type: 'number',  notes: null,                                  ...parseMinMax('20-1000') },
      { category: 'Metabolic', vital_name: buildName('Blood Glucose', 'Fasting'),                   unit: 'mg/dL',   data_type: 'number',  notes: null,                                  ...parseMinMax('25-500') },
      { category: 'Metabolic', vital_name: buildName('Blood Glucose', 'Post-Prandial (2hr)'),       unit: 'mg/dL',   data_type: 'number',  notes: null,                                  ...parseMinMax('20-600') },
      { category: 'Metabolic', vital_name: buildName('Ketones', 'Blood/Urine'),                     unit: 'mmol/L',  data_type: 'number',  notes: null,                                  ...parseMinMax('0.0-10.0') },
      { category: 'Metabolic', vital_name: buildName('Hemoglobin A1c', null),                       unit: '%',       data_type: 'number',  notes: null,                                  ...parseMinMax('3.0-17.0') },
      { category: 'Metabolic', vital_name: buildName('Urinalysis', 'Dipstick'),                     unit: null,      data_type: 'text',    notes: 'Protein/Glucose/Blood presence',      ...parseMinMax('NA') },

      // ── Symptoms ─────────────────────────────────────────────────────────────
      { category: 'Symptoms', vital_name: buildName('Fever Present', 'Self-reported'),              unit: null,      data_type: 'boolean', notes: 'Subjective',                          ...parseMinMax('NA') },
      { category: 'Symptoms', vital_name: buildName('Chest Pain', 'Self-reported'),                 unit: null,      data_type: 'boolean', notes: null,                                  ...parseMinMax('NA') },
      { category: 'Symptoms', vital_name: buildName('Shortness of Breath', 'Self-reported'),        unit: null,      data_type: 'boolean', notes: 'Dyspnea',                             ...parseMinMax('NA') },
      { category: 'Symptoms', vital_name: buildName('Palpitations', 'Self-reported'),               unit: null,      data_type: 'boolean', notes: null,                                  ...parseMinMax('NA') },
      { category: 'Symptoms', vital_name: buildName('Dizziness', 'Self-reported'),                  unit: null,      data_type: 'boolean', notes: null,                                  ...parseMinMax('NA') },
      { category: 'Symptoms', vital_name: buildName('Recent Fall', 'Self-reported'),                unit: null,      data_type: 'boolean', notes: 'History check',                       ...parseMinMax('NA') },
      { category: 'Symptoms', vital_name: buildName('Edema (Swelling)', 'Pitting Scale'),           unit: '0-4+',    data_type: 'number',  notes: null,                                  ...parseMinMax('0-4') },
      { category: 'Symptoms', vital_name: buildName('Skin Turgor', 'Hydration'),                    unit: null,      data_type: 'text',    notes: 'Normal / Decreased (Tenting)',        ...parseMinMax('NA') },

      // ── Reproductive ─────────────────────────────────────────────────────────
      { category: 'Reproductive', vital_name: buildName('Pregnancy Status', null),                  unit: null,      data_type: 'boolean', notes: null,                                  ...parseMinMax('NA') },
      { category: 'Reproductive', vital_name: buildName('Last Menstrual Period (LMP)', null),       unit: null,      data_type: 'date',    notes: null,                                  ...parseMinMax('NA') },
      { category: 'Reproductive', vital_name: buildName('Visual Acuity', 'Right Eye (OD)'),         unit: 'Ratio',   data_type: 'text',    notes: 'e.g. 20/20',                          ...parseMinMax('NA') },
      { category: 'Reproductive', vital_name: buildName('Visual Acuity', 'Left Eye (OS)'),          unit: 'Ratio',   data_type: 'text',    notes: 'e.g. 20/20',                          ...parseMinMax('NA') },

      // ── Invasive / ICU ───────────────────────────────────────────────────────
      { category: 'Invasive / ICU', vital_name: buildName('Arterial Blood Pressure (IBP)', 'Systolic'),  unit: 'mmHg', data_type: 'number', notes: 'Via Arterial Line',                ...parseMinMax('20-300') },
      { category: 'Invasive / ICU', vital_name: buildName('Arterial Blood Pressure (IBP)', 'Diastolic'), unit: 'mmHg', data_type: 'number', notes: 'Via Arterial Line',                ...parseMinMax('20-150') },
      { category: 'Invasive / ICU', vital_name: buildName('Central Venous Pressure (CVP)', null),        unit: 'mmHg', data_type: 'number', notes: 'Via Central Line',                 ...parseMinMax('0-15') },
      { category: 'Invasive / ICU', vital_name: buildName('Intracranial Pressure (ICP)', null),          unit: 'mmHg', data_type: 'number', notes: 'Neuro-monitoring',                 ...parseMinMax(null) },
      { category: 'Invasive / ICU', vital_name: buildName('Intra-abdominal Pressure (IAP)', null),       unit: 'mmHg', data_type: 'number', notes: 'Bladder pressure',                 ...parseMinMax('0-50') },
      { category: 'Invasive / ICU', vital_name: buildName('Cardiac Output', 'Continuous'),               unit: 'L/min',data_type: 'number', notes: null,                               ...parseMinMax('0.5-40') },
      { category: 'Invasive / ICU', vital_name: buildName('Mixed Venous O₂ (SvO₂)', null),               unit: '%',    data_type: 'number', notes: null,                               ...parseMinMax('60-80') },
      { category: 'Invasive / ICU', vital_name: buildName('Bispectral Index (BIS)', 'Sedation Depth'),   unit: 'Score',data_type: 'number', notes: '0–100',                            ...parseMinMax('0-100') },

      // ── Obstetrics ───────────────────────────────────────────────────────────
      { category: 'Obstetrics', vital_name: buildName('Fetal Heart Rate', null),                    unit: 'bpm',  data_type: 'number', notes: 'Range 110–160',                          ...parseMinMax('110-160') },
      { category: 'Obstetrics', vital_name: buildName('Fundal Height', null),                       unit: 'cm',   data_type: 'number', notes: null,                                     ...parseMinMax(null) },
      { category: 'Obstetrics', vital_name: buildName('Cervical Dilation', null),                   unit: 'cm',   data_type: 'number', notes: '0–10 cm',                                ...parseMinMax('0-10') },
      { category: 'Obstetrics', vital_name: buildName('Contraction Frequency', null),               unit: 'min',  data_type: 'number', notes: 'Minutes apart',                          ...parseMinMax(null) },
      { category: 'Obstetrics', vital_name: buildName('APGAR Score', '1 Minute'),                   unit: 'Score',data_type: 'number', notes: '0–10',                                   ...parseMinMax('0-10') },
      { category: 'Obstetrics', vital_name: buildName('APGAR Score', '5 Minute'),                   unit: 'Score',data_type: 'number', notes: '0–10',                                   ...parseMinMax('0-10') },

      // ── Fluids ───────────────────────────────────────────────────────────────
      { category: 'Fluids', vital_name: buildName('Urine Output', 'Hourly'),                        unit: 'mL/hr',data_type: 'number', notes: 'Kidney function check',                  ...parseMinMax(null) },
      { category: 'Fluids', vital_name: buildName('Fluid Intake', 'Total Input'),                   unit: 'mL',   data_type: 'number', notes: 'Oral + IV',                              ...parseMinMax('0-20000') },
      { category: 'Fluids', vital_name: buildName('Drain Output', 'Total Output'),                  unit: 'mL',   data_type: 'number', notes: 'Surgical drains',                        ...parseMinMax('0-10000') },
    ].map(v => ({ ...v, is_active: true }));

    await queryInterface.bulkInsert('global_vital_catalog', vitals);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('global_vital_catalog', null, {});
  },
};