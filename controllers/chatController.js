/**
 * chatController.js
 * Fettlemed — Insights Agent chat controller.
 *
 * Session model:
 *   - One "global" thread per patient (persists across sessions)
 *   - One "document" thread per upload_id (persists across sessions)
 *   - Server owns history — Flutter sends only the new message
 *
 * Context window strategy: Rolling Haiku summary.
 *   - Up to HISTORY_HARD_LIMIT messages stored in chat_messages
 *   - When limit is exceeded, oldest SUMMARISE_BATCH are summarised via Haiku
 *     and deleted. The summary is merged into chat_threads.summary.
 *   - On each request Claude receives: [summary injection] + stored messages + new message
 *
 * Subscription note:
 *   HISTORY_HARD_LIMIT and SUMMARISE_BATCH are the only two numbers to change
 *   when offering higher context limits to premium subscribers.
 *
 * Hard exclusion: observations_private is never queried in this file.
 */

'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { Op } = require('sequelize');
const models = require('../models');
const { buildMedicalContextObject, resolveClinicPatientIds } = require('../services/profileAggregator');
const redis = require('../services/redisClient');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Context Window Config ────────────────────────────────────────────────────
// Edit these two values to change context limits (e.g. per subscription tier).
// HISTORY_HARD_LIMIT: max messages kept in chat_messages before pruning.
// SUMMARISE_BATCH:    how many oldest messages to collapse when limit is exceeded.
//                     Must be less than HISTORY_HARD_LIMIT.

const HISTORY_HARD_LIMIT = 30;
const SUMMARISE_BATCH    = 15;

// ─── Rate Limit Config ────────────────────────────────────────────────────────

const RATE_LIMITS = [
  { key: 'rl:min',  windowSec: 60,    max: 10  },
  { key: 'rl:hour', windowSec: 3600,  max: 60  },
  { key: 'rl:day',  windowSec: 86400, max: 200 },
];

// ─── Domain Classification Config ─────────────────────────────────────────────

const DOMAIN_KEYWORDS = {
  cardiology:       ['heart', 'cardiac', 'chest', 'coronary', 'ecg', 'echo', 'aorta', 'bp', 'blood pressure'],
  neurology:        ['brain', 'neuro', 'spine', 'mri head', 'stroke', 'seizure', 'nerve', 'cervical', 'lumbar'],
  endocrinology:    ['thyroid', 'diabetes', 'glucose', 'hba1c', 'insulin', 'adrenal', 'pituitary'],
  orthopedics:      ['bone', 'joint', 'knee', 'hip', 'shoulder', 'fracture', 'spine', 'xray', 'x-ray'],
  pulmonology:      ['lung', 'chest', 'pulmonary', 'bronch', 'sputum', 'oxygen', 'spo2', 'ct chest'],
  oncology:         ['cancer', 'tumour', 'tumor', 'biopsy', 'oncology', 'chemotherapy', 'radiation', 'mass'],
  nephrology:       ['kidney', 'renal', 'creatinine', 'egfr', 'dialysis', 'urine', 'proteinuria'],
  gastroenterology: ['stomach', 'bowel', 'colon', 'liver', 'gastro', 'endoscopy', 'abdomen', 'hepatic'],
};

const ICD_PREFIX_MAP = {
  I: 'cardiology',
  G: 'neurology',
  E: 'endocrinology',
  M: 'orthopedics',
  J: 'pulmonology',
  C: 'oncology',
  D: 'oncology',
  N: 'nephrology',
  K: 'gastroenterology',
};

const PROFILE_CACHE_TTL = 600;

// ─── Rate Limiting ────────────────────────────────────────────────────────────

async function checkRateLimit(userId) {
  const now = Math.floor(Date.now() / 1000);

  for (const limit of RATE_LIMITS) {
    const windowStart = now - (now % limit.windowSec);
    const key = `${limit.key}:${userId}:${windowStart}`;

    let count;
    try {
      count = await redis.incr(key);
      if (count === 1) await redis.expire(key, limit.windowSec + 10);
    } catch (err) {
      console.warn('[chatController] Rate limit Redis error (failing open):', err.message);
      continue;
    }

    if (count > limit.max) {
      const labels = { 'rl:min': 'minute', 'rl:hour': 'hour', 'rl:day': 'day' };
      return { windowLabel: labels[limit.key], max: limit.max };
    }
  }

  return null;
}

// ─── Profile Cache ────────────────────────────────────────────────────────────

async function getOrBuildProfile(patientProfileId, userId) {
  // Cache keyed by patientProfileId — matches invalidateProfileCache() in documentOcrWorker.js
  // buildMedicalContextObject takes userId and resolves patientProfileId internally
  const cacheKey = `profile:${patientProfileId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('[chatController] Redis profile read failed:', err.message);
  }

  const context = await buildMedicalContextObject(models, userId);

  try {
    await redis.set(cacheKey, JSON.stringify(context), 'EX', PROFILE_CACHE_TTL);
  } catch (err) {
    console.warn('[chatController] Redis profile write failed:', err.message);
  }

  return context;
}

// ─── Thread Resolution ────────────────────────────────────────────────────────

/**
 * Finds or creates the appropriate ChatThread for this request.
 * Global: one per patient. Document: one per upload_id.
 * findOrCreate is atomic — safe under concurrent requests.
 */
async function resolveThread(userId, contextType, uploadId) {
  const where =
    contextType === 'document'
      ? { thread_type: 'document', upload_id: uploadId }
      : { thread_type: 'global',   user_id: userId };

  const defaults = {
    user_id: userId,   // chat_threads.user_id → users.id
    thread_type: contextType,
    upload_id: contextType === 'document' ? uploadId : null,
    summary: null,
  };

  const [thread] = await models.ChatThread.findOrCreate({ where, defaults });
  return thread;
}

// ─── Rolling Summary ──────────────────────────────────────────────────────────

/**
 * If the thread exceeds HISTORY_HARD_LIMIT messages, summarises the oldest
 * SUMMARISE_BATCH via Haiku, merges into thread.summary, and deletes them.
 *
 * Called via setImmediate after the response is sent — patient doesn't wait.
 */
async function maybeSummarise(thread) {
  const totalCount = await models.ChatMessage.count({
    where: { thread_id: thread.id },
  });

  if (totalCount <= HISTORY_HARD_LIMIT) return;

  const toSummarise = await models.ChatMessage.findAll({
    where: { thread_id: thread.id },
    order: [['created_at', 'ASC']],
    limit: SUMMARISE_BATCH,
    raw: true,
  });

  if (toSummarise.length === 0) return;

  const transcript = toSummarise
    .map((m) => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const existingSummary = thread.summary;
  const summaryContext = existingSummary
    ? `Previous summary:\n${existingSummary}\n\nNew conversation segment to incorporate:\n${transcript}`
    : `Conversation to summarise:\n${transcript}`;

  let newSummary;
  try {
    const result = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0,
      system:
        'You summarise medical chat conversations. Produce a concise, factual summary ' +
        'of what the patient asked and what the assistant explained. ' +
        'Preserve any clinically relevant details (values mentioned, concerns raised, advice given). ' +
        'If a previous summary is provided, merge the new segment into it. ' +
        'Output plain text only, no headings or bullets. Maximum 200 words.',
      messages: [{ role: 'user', content: summaryContext }],
    });
    newSummary = result.content[0]?.text?.trim() || existingSummary;
  } catch (err) {
    // Non-fatal — skip this pruning cycle, try again next turn
    console.error('[chatController] Summarisation failed (skipping prune):', err.message);
    return;
  }

  const idsToDelete = toSummarise.map((m) => m.id);

  await models.ChatThread.update(
    { summary: newSummary },
    { where: { id: thread.id } }
  );

  await models.ChatMessage.destroy({
    where: { id: { [Op.in]: idsToDelete } },
  });

  console.log(
    `[chatController] Thread ${thread.id}: summarised ${idsToDelete.length} messages. ` +
    `${totalCount - idsToDelete.length} remain.`
  );
}

// ─── Layer 3: Document Mode ───────────────────────────────────────────────────

async function buildLayer3Document(uploadId, patientProfileId) {
  // Query all 4 PHR tables in parallel — the upload may be any type.
  // patientProfileId is included in every query to prevent cross-patient leakage.
  const [imagingRows, vitalRows, medicationRows, encounterRows] = await Promise.all([
    models.PhrImagingReport.findAll({
      where: { upload_id: uploadId, patient_profile_id: patientProfileId },
      attributes: ['body_part', 'modality', 'impression', 'findings', 'report_date', 'id'],
      raw: true,
    }),
    models.PhrVital.findAll({
      where: { upload_id: uploadId, patient_profile_id: patientProfileId },
      attributes: ['vital_name', 'vital_value', 'unit', 'recorded_at', 'id'],
      raw: true,
    }),
    models.PhrMedication.findAll({
      where: { upload_id: uploadId, patient_profile_id: patientProfileId },
      attributes: ['medication_name', 'dosage', 'frequency', 'duration', 'id'],
      raw: true,
    }),
    models.PhrEncounter.findAll({
      where: { upload_id: uploadId, patient_profile_id: patientProfileId },
      attributes: ['reason_for_visit', 'admission_date', 'discharge_date', 'id'],
      raw: true,
    }),
  ]);

  // If nothing found in any table, the uploadId doesn't belong to this patient
  const totalRows = imagingRows.length + vitalRows.length + medicationRows.length + encounterRows.length;
  if (totalRows === 0) return null;

  const layer3 = {
    type: 'document',
    upload_id: uploadId,
    // Only include tables that have data for this document
    ...(imagingRows.length > 0 && {
      imaging: imagingRows.map((r) => ({
        body_part: r.body_part,
        modality: r.modality,
        impression: r.impression,
        findings: r.findings, // full findings exposed in document mode only
        date: r.report_date,
      })),
    }),
    ...(vitalRows.length > 0 && {
      vitals: vitalRows.map((r) => ({
        name: r.vital_name,
        value: r.vital_value,
        unit: r.unit,
        date: r.recorded_at,
      })),
    }),
    ...(medicationRows.length > 0 && {
      medications: medicationRows.map((r) => ({
        name: r.medication_name,
        dosage: r.dosage,
        frequency: r.frequency,
        duration: r.duration,
      })),
    }),
    ...(encounterRows.length > 0 && {
      encounters: encounterRows.map((r) => ({
        reason: r.reason_for_visit,
        admission_date: r.admission_date,
        discharge_date: r.discharge_date,
      })),
    }),
  };

  return layer3;
}

// ─── Layer 3: Global Mode ─────────────────────────────────────────────────────

async function classifyDomain(userMessage) {
  const domains = Object.keys(DOMAIN_KEYWORDS).join(' | ');
  try {
    const result = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      temperature: 0,
      system: `You are a medical domain classifier. Given a patient's message, output exactly one of these domains and nothing else: ${domains} | general | other`,
      messages: [{ role: 'user', content: userMessage }],
    });
    const domain = result.content[0]?.text?.trim().toLowerCase();
    if (!domain || domain === 'general' || domain === 'other' || !DOMAIN_KEYWORDS[domain]) return null;
    return domain;
  } catch (err) {
    console.warn('[chatController] Domain classification failed:', err.message);
    return null;
  }
}

async function buildLayer3Global(domain, patientProfileId, clinicPatientIds) {
  const keywords = DOMAIN_KEYWORDS[domain] || [];
  const layer3 = { domain, imaging: [], diagnoses_inactive: [], encounters: [], consultations: [] };

  const imagingRows = await models.PhrImagingReport.findAll({
    where: {
      patient_profile_id: patientProfileId,
      body_part: { [Op.iLike]: { [Op.any]: keywords.map((k) => `%${k}%`) } },
    },
    attributes: ['body_part', 'modality', 'impression', 'report_date', 'id'],
    order: [['report_date', 'DESC']],
    limit: 3,
    raw: true,
  });
  layer3.imaging = imagingRows.map((r) => ({
    body_part: r.body_part, modality: r.modality,
    impression: r.impression, date: r.report_date, upload_id: r.id,
  }));

  if (clinicPatientIds.length > 0) {
    const relevantPrefixes = Object.entries(ICD_PREFIX_MAP)
      .filter(([, d]) => d === domain)
      .map(([prefix]) => prefix);

    if (relevantPrefixes.length > 0) {
      const diagnosisRows = await models.AppointmentDiagnosis.findAll({
        where: {
          clinic_patient_id: { [Op.in]: clinicPatientIds },
          is_active: false,
          code: { [Op.or]: relevantPrefixes.map((p) => ({ [Op.iLike]: `${p}%` })) },
        },
        attributes: ['description', 'code', 'type'],
        order: [['created_at', 'DESC']],
        limit: 5,
        raw: true,
      });
      layer3.diagnoses_inactive = diagnosisRows.map((r) => ({
        description: r.description, code: r.code, type: r.type,
      }));
    }
  }

  const encounterRows = await models.PhrEncounter.findAll({
    where: {
      patient_profile_id: patientProfileId,
      reason_for_visit: { [Op.iLike]: { [Op.any]: keywords.map((k) => `%${k}%`) } },
    },
    attributes: ['reason_for_visit', 'discharge_date', 'admission_date', 'attending_doctor'],
    order: [['admission_date', 'DESC']],
    offset: 3,
    limit: 3,
    raw: true,
  });
  layer3.encounters = encounterRows.map((r) => ({
    reason: r.reason_for_visit,
    date: r.discharge_date || r.admission_date,
    doctor: r.attending_doctor,
  }));

  // HARD EXCLUSION: observations_private never queried
  if (clinicPatientIds.length > 0) {
    const noteRows = await models.ConsultationNote.findAll({
      where: {
        clinic_patient_id: { [Op.in]: clinicPatientIds },
        subjective: { [Op.iLike]: { [Op.any]: keywords.map((k) => `%${k}%`) } },
      },
      attributes: ['subjective', 'objective', 'diagnosis_comments', 'created_at'],
      order: [['created_at', 'DESC']],
      offset: 2,
      limit: 3,
      raw: true,
    });
    layer3.consultations = noteRows.map((r) => ({
      date: r.created_at, subjective: r.subjective,
      objective: r.objective, diagnosis_comments: r.diagnosis_comments,
    }));
  }

  return layer3;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(profile, layer3) {
  // In document mode: only send the document data as context, not the full profile.
  // This keeps the prompt small enough to leave room for a full reply within max_tokens,
  // and prevents the global profile vitals from bleeding into document-specific answers.
  const isDocumentMode = layer3?.type === 'document';
  // Always include the patient profile. In document mode, layer3 contains the specific
  // document data and takes priority; the profile provides essential background context
  // (allergies, active medications, diagnoses) for clinically meaningful answers.
  const contextObject = layer3 ? { ...profile, layer3 } : { ...profile };

  const documentModeBlock = isDocumentMode
    ? [
        '',
        'DOCUMENT MODE — IMPORTANT:',
        '- The patient is asking about a specific uploaded document.',
        '- Answer using ONLY the data in the document context below.',
        '- Do not reference the patient\'s general profile (other vitals, medications, history)',
        '  unless the patient explicitly asks to compare with their general records.',
        '- If the document does not contain what the patient is asking about, say so clearly.',
        '',
      ].join('\n')
    : '';

  const patientName = profile.patient?.name || 'this patient';

  const lines = [
    `You are a personal health assistant for ${patientName}.`,
    '',
    'CRITICAL OUTPUT RULE — READ THIS FIRST:',
    'Every single response MUST end with this exact JSON block on its own line, with nothing after it.',
    'This rule applies to every reply without exception:',
    '{"_meta":{"doctorNudge":true|false,"sourceUploadIds":[int,...]}}',
    'Replace true|false with the actual boolean. Replace [...] with actual upload_id integers or [].',
    'Example of a correctly formatted response:',
    '  Your heart rate of 85 BPM is within the normal range of 60-100 BPM.',
    '  {"_meta":{"doctorNudge":false,"sourceUploadIds":[]}}',
    'If you omit this JSON block, the application will fail. Always include it.',
    'Absolutely no emojis in resposnse',
    '',
    'YOUR ROLE:',
    '- Help the patient understand their health records in plain, calm language.',
    '- Explain what values mean, what conditions involve, what follow-up instructions say.',
    '- If something warrants medical attention, gently recommend they speak to their doctor.',
    '- Never diagnose. Never speculate about conditions not evidenced in the records.',
    '- Never use alarming language. Be informative and reassuring.',
    documentModeBlock,
    'BOUNDARIES:',
    '- If asked about something not in the profile, say so clearly — do not invent.',
    '- If asked to book appointments or prescribe medication, explain you can only help',
    '  with understanding records, and direct to the relevant app section.',
    '- If data appears incomplete or inconsistent, say so rather than presenting it as fact.',
    '- Never reference, quote, or acknowledge the existence of any private clinical notes.',
    '',
    '_meta field rules:',
    '- doctorNudge: true ONLY if your reply actively recommends the patient consult a doctor.',
    '  false if you merely mention a doctor in passing or say they don\'t need to see one.',
    '- sourceUploadIds: array of upload_id integers from the document context you referenced.',
    '  Empty array [] if no specific uploaded documents were referenced.',
    '',
    'TONE AND FORMATTING:',
    '- Warm, calm, and direct. Write like a knowledgeable friend — not a formal system,',
    '  not an overexcited chatbot.',
    '- Do not open any response with a sycophantic affirmation. No "Great question!",',
    '  "Absolutely!", "Of course!", "Happy to help!", or any variation. Just answer.',
    '- No emoji of any kind — not for status, not for sections, not anywhere.',
    '  This includes ✓ ✗ ✅ ❌ 📋 ❤️ and all similar Unicode symbols.',
    '- Use plain prose. Only use a bullet list when presenting 3 or more genuinely distinct',
    '  items (e.g. a list of medications). For explanations and single findings, write in',
    '  sentences.',
    '- Never format a vitals response like this:',
    '    Heart Rate: 85 BPM',
    '    • Status: ✓ Normal',
    '    • Range: 60–100 BPM',
    '- Instead write it like this:',
    '    Your heart rate was 85 BPM in February, which is well within the normal range of 60–100.',
    '- Avoid filler phrases: "It\'s important to note that", "Keep in mind that",',
    '  "It\'s worth mentioning", "As always". Say the thing directly.',
    '- Plain language over clinical stiffness. "Your blood pressure looks normal" is better',
    '  than "The recorded value appears to be within acceptable parameters."',
    '- If something warrants a doctor visit, say it naturally and kindly.',
    '  "It\'s worth checking with your doctor about this" is the right register.',
    '  Do not catastrophise, and do not bury it either.',
    '',
    '',
    'Here is the patient\'s health profile and document context (JSON):',
    JSON.stringify(contextObject, null, 2),
    '',
    'REMINDER: Your response MUST end with the _meta JSON block on its own line. No exceptions.',
  ];

  return lines.join('\n');
}


// ─── _meta Parser ─────────────────────────────────────────────────────────────

function parseReply(rawText) {
  const metaDefault = { doctorNudge: false, sourceUploadIds: [] };
  const metaMatch = rawText.match(/\n?\s*(\{"_meta":.+\})\s*$/s);

  if (!metaMatch) {
    console.warn('[chatController] _meta block missing from Claude reply');
    return { reply: rawText.trim(), meta: metaDefault };
  }

  const cleanReply = rawText.slice(0, rawText.length - metaMatch[0].length).trim();

  let meta = metaDefault;
  try {
    const parsed = JSON.parse(metaMatch[1]);
    meta = {
      doctorNudge: Boolean(parsed._meta?.doctorNudge),
      sourceUploadIds: Array.isArray(parsed._meta?.sourceUploadIds)
        ? parsed._meta.sourceUploadIds.filter(Number.isInteger)
        : [],
    };
  } catch (err) {
    console.warn('[chatController] Failed to parse _meta block:', err.message);
  }

  return { reply: cleanReply, meta };
}

// ─── Main Controller ──────────────────────────────────────────────────────────

exports.sendMessage = async (req, res) => {
  const userId = req.user.id; // users.id from JWT

  // ── 0. Resolve both identity values ──────────────────────────────────────
  // Two separate identity paths:
  //   userId           → clinic_patient.global_patient_id  (clinic fan-out)
  //   patientProfileId → phr_*.patient_profile_id          (PHR queries + cache key)
  let patientProfileId;
  try {
    const profileRow = await models.PatientProfile.findOne({
      where: { user_id: userId },
      attributes: ['id'],
      raw: true,
    });
    if (!profileRow) {
      return res.status(403).json({
        error: { code: 'NO_PROFILE', message: 'No patient profile found for this account.' },
      });
    }
    patientProfileId = profileRow.id;
  } catch (err) {
    console.error('[chatController] Patient profile lookup failed:', err);
    return res.status(500).json({
      error: { code: 'PROFILE_LOOKUP_FAILED', message: 'Could not load your profile. Please try again.' },
    });
  }

  // ── 1. Rate limit (keyed by userId — stable, no profile lookup needed) ────
  const breach = await checkRateLimit(userId);
  if (breach) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `You've sent too many messages. You can send up to ${breach.max} messages per ${breach.windowLabel}. Please wait before trying again.`,
      },
    });
  }

  // ── 2. Validate request ───────────────────────────────────────────────────
  const { context, message } = req.body;

  if (!context || !['global', 'document'].includes(context.type)) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'context.type must be "global" or "document".' },
    });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'message is required and must be a non-empty string.' },
    });
  }
  if (context.type === 'document' && !context.uploadId) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'context.uploadId is required for document mode.' },
    });
  }

  const uploadId = context.type === 'document' ? parseInt(context.uploadId, 10) : null;

  // ── 3. Resolve thread ─────────────────────────────────────────────────────
  let thread;
  try {
    thread = await resolveThread(userId, context.type, uploadId);
  } catch (err) {
    console.error('[chatController] Thread resolution failed:', err);
    return res.status(500).json({
      error: { code: 'THREAD_ERROR', message: 'Could not load chat session. Please try again.' },
    });
  }

  // ── 4. Load stored history ────────────────────────────────────────────────
  let storedMessages;
  try {
    storedMessages = await models.ChatMessage.findAll({
      where: { thread_id: thread.id },
      order: [['created_at', 'ASC']],
      attributes: ['role', 'content'],
      raw: true,
    });
  } catch (err) {
    console.error('[chatController] History load failed:', err);
    return res.status(500).json({
      error: { code: 'HISTORY_ERROR', message: 'Could not load chat history. Please try again.' },
    });
  }

  // ── 5. Load profile (Layer 1+2) ───────────────────────────────────────────
  let profile;
  try {
    profile = await getOrBuildProfile(patientProfileId, userId);
  } catch (err) {
    console.error('[chatController] Profile load failed:', err);
    return res.status(500).json({
      error: { code: 'PROFILE_LOAD_FAILED', message: 'Could not load your health profile. Please try again.' },
    });
  }

  // ── 6. Build Layer 3 ──────────────────────────────────────────────────────
  let layer3 = null;
  try {
    if (context.type === 'document') {
      layer3 = await buildLayer3Document(uploadId, patientProfileId);
    } else {
      const domain = await classifyDomain(message.trim());
      if (domain) {
        const clinicPatientIds = await resolveClinicPatientIds(models, userId);
        layer3 = await buildLayer3Global(domain, patientProfileId, clinicPatientIds);
      }
    }
  } catch (err) {
    console.error('[chatController] Layer 3 build failed (degrading gracefully):', err);
    layer3 = null;
  }

  // ── 7. Assemble Claude messages array ─────────────────────────────────────
  // [summary injection if exists] + [stored history] + [new user message]
  const claudeMessages = [];

  if (thread.summary) {
    // Inject summary as a user/assistant exchange so the array stays valid
    claudeMessages.push({
      role: 'user',
      content: `[Earlier in this conversation: ${thread.summary}]`,
    });
    claudeMessages.push({
      role: 'assistant',
      content: 'Understood. I have context from our earlier conversation.',
    });
  }

  for (const m of storedMessages) {
    claudeMessages.push({ role: m.role, content: m.content });
  }

  claudeMessages.push({ role: 'user', content: message.trim() });

  // ── 8. Call Claude Sonnet ─────────────────────────────────────────────────
  let rawReply;
  try {
    const systemPrompt = buildSystemPrompt(profile, layer3);
    console.log(
      `[chatController] Sending to Claude — mode: ${context.type}, ` +
      `system prompt chars: ${systemPrompt.length}, ` +
      `messages: ${claudeMessages.length}`
    );
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages,
    });
    rawReply = response.content[0]?.text || '';
    console.log(
      `[chatController] Claude responded — stop_reason: ${response.stop_reason}, ` +
      `input_tokens: ${response.usage?.input_tokens}, ` +
      `output_tokens: ${response.usage?.output_tokens}, ` +
      `reply_chars: ${rawReply.length}, ` +
      `has_meta: ${rawReply.includes('"_meta"')}`
    );
  } catch (err) {
    console.error('[chatController] Claude API call failed:', err);
    return res.status(502).json({
      error: {
        code: 'AI_UNAVAILABLE',
        message: 'The health assistant is temporarily unavailable. Please try again in a moment.',
      },
    });
  }

  // ── 9. Parse _meta ────────────────────────────────────────────────────────
  const { reply, meta } = parseReply(rawReply);

  // ── 10. Enrich meta with source upload filenames ──────────────────────────
  // Look up report_type and original_filename for any sourceUploadIds Claude cited.
  // This lets Flutter render named attachment chips without a separate fetch.
  let sourceUploads = [];
  if (meta.sourceUploadIds.length > 0) {
    try {
      const uploadRows = await models.ReportUpload.findAll({
        where: { id: { [Op.in]: meta.sourceUploadIds } },
        attributes: ['id', 'report_type', 'original_filename','upload_url'],
        raw: true,
      });
      sourceUploads = uploadRows.map((u) => ({
        id: u.id,
        reportType: u.report_type,
        originalFilename: u.original_filename,
        viewUrl: u.upload_url,
      }));
    } catch (err) {
      // Non-fatal — Flutter falls back to showing upload ID only
      console.warn('[chatController] Source upload lookup failed:', err.message);
    }
  }

  // ── 11. Persist new turn ──────────────────────────────────────────────────
  try {
    await models.ChatMessage.bulkCreate([
      { thread_id: thread.id, role: 'user',      content: message.trim() },
      { thread_id: thread.id, role: 'assistant', content: reply          },
    ]);
  } catch (err) {
    // Non-fatal — patient still gets their answer, turn is just not stored
    console.error('[chatController] Message persistence failed:', err);
  }

  // ── 12. Rolling summary check — runs after response is sent ───────────────
  setImmediate(() => {
    maybeSummarise(thread).catch((err) =>
      console.error('[chatController] maybeSummarise error:', err)
    );
  });

  // ── 13. Return ────────────────────────────────────────────────────────────
  try {
    return res.json({ reply, meta: { ...meta, sourceUploads } });
  } catch (err) {
    console.error('[chatController] res.json serialisation failed:', err);
    console.error('[chatController] reply length:', reply?.length, 'meta:', JSON.stringify(meta));
    return res.status(500).json({
      error: { code: 'RESPONSE_ERROR', message: 'Could not send response. Please try again.' },
    });
  }
};