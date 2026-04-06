const { Worker } = require('bullmq');
const Anthropic = require('@anthropic-ai/sdk');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const {
  ReportUpload, DocumentOcrData,
  PhrVital, PhrMedication, PhrEncounter, PhrImagingReport,
  PatientProfile, User
} = require('../models');

const { invalidateProfileCache } = require('../routes/profileAggregatedRoutes');

// Initialize Clients
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

// S3 Helper to fetch file as base64
async function getS3FileBase64(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(chunk);
  return Buffer.concat(chunks).toString('base64');
}

const worker = new Worker('document-ocr-queue', async job => {
  const { uploadId, s3Bucket, s3Key, expectedCategory, patientProfileId } = job.data;

  try {
    // 1. Mark as Processing
    await ReportUpload.update({ status: 'PROCESSING' }, { where: { id: uploadId } });

    // 2. Fetch User & Profile Info (name used server-side only — never sent to AI)
    const patient = await PatientProfile.findByPk(patientProfileId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!patient || !patient.user) throw new Error('Patient or User profile not found');

    // 3. Fetch Document from S3
    const fileBase64 = await getS3FileBase64(s3Bucket, s3Key);

    const ext = s3Key.split('.').pop().toLowerCase();
    let blockType = 'image';
    let mediaType = 'image/jpeg';

    if (ext === 'pdf') {
      blockType = 'document';
      mediaType = 'application/pdf';
    } else if (ext === 'png') {
      mediaType = 'image/png';
    } else if (ext === 'webp') {
      mediaType = 'image/webp';
    }

    // 4. Build System Prompt
    // NOTE (Known Issue #7): All four document types handled in a single prompt.
    // Recommended fix is a two-stage classify→extract pipeline. Deferred.
    const systemPrompt = `
You are an expert medical data extractor. Extract data from medical documents into strict JSON.
Expected Document Category: "${expectedCategory}".

Return ONLY this JSON structure with NO markdown, NO code fences, NO extra text:
{
  "extracted_data": {
    "patient_name": "Full name as written on document, or null",
    "document_date": "YYYY-MM-DD or null",
    "document_category": "Prescription | Lab Report | Imaging | Discharge Summary",

    "vitals": [
      { "name": "String", "value": "String", "unit": "String" }
    ],

    "medications": [
      { "name": "String", "dosage": "String", "frequency": "String", "duration": "String" }
    ],
    "prescribed_by": "Doctor or clinic name if visible, else null",

    "encounter": {
      "admission_date": "YYYY-MM-DD or null",
      "discharge_date": "YYYY-MM-DD or null",
      "reason_for_visit": "String or null",
      "followup_instructions": "String or null",
      "attending_doctor": "String or null"
    },

    "imaging": {
      "modality": "MRI | CT | X-Ray | Ultrasound | PET | null",
      "body_part": "String or null",
      "impression": "String or null",
      "findings": "String or null",
      "reported_by": "String or null"
    }
  },
  "flags": [],
  "is_clean": true
}

POPULATION RULES — follow these exactly:
- "vitals":        populate ONLY for Lab Report. Empty array [] for all other types.
- "medications":   populate ONLY for Prescription. Empty array [] for all other types.
- "prescribed_by": populate ONLY for Prescription. null for all other types.
- "encounter":     populate ONLY for Discharge Summary. Set ALL fields to null for all other types.
- "imaging":       populate ONLY for Imaging. Set ALL fields to null for all other types.
- For dosage/frequency/duration: use empty string "" if not stated on the document.
- For "findings" and "impression": summarise in 2-3 sentences maximum. Do not reproduce verbatim text blocks.
- For "followup_instructions": summarise in 1-2 sentences maximum.

FLAG RULES — add objects to the "flags" array as needed:
- CATEGORY_MISMATCH: document_category does not match expected "${expectedCategory}".
- ABNORMAL_VITAL:    a vital value is dangerously outside normal range.
- MISSING_DATE:      document_date (or discharge_date for Discharge Summary) cannot be determined.
- MISSING_UNIT:      a vital is present but its unit cannot be read.
- UNREADABLE:        the document is too blurry or damaged to extract data reliably.

NOTE: Do NOT validate the patient name here. Extract it exactly as written on the document.
Name validation is performed server-side.
`;

    // 5. Call Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: blockType,
              source: { type: 'base64', media_type: mediaType, data: fileBase64 }
            },
            {
              type: 'text',
              text: 'Extract the data according to the system instructions and return ONLY valid JSON. If a date cannot be determined, set it to null and add the appropriate flag.'
            }
          ]
        }
      ]
    });

    // 6. Parse Claude Response
    const responseText = message.content[0].text;
    const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const resultData = JSON.parse(jsonString);

    // 7. Server-side name match (name is never sent to AI for comparison)
    // FIX (Known Issue #1): Replaced AND-both-tokens check with token overlap.
    // Old logic required BOTH first AND last name to appear — false-positived on
    // single-name patients and surname-first documents (common in Indian records).
    // New logic: extract meaningful tokens (>3 chars) from both strings and flag
    // only when ZERO tokens overlap. A single shared token (e.g. surname alone)
    // is enough to pass — handles surname-first, initials-dropped, and OCR noise
    // on the given name while still catching genuinely foreign documents.
    const extractedName  = (resultData.extracted_data.patient_name || '').toLowerCase();
    const profileName    = `${patient.user.first_name} ${patient.user.last_name}`.toLowerCase();

    function meaningfulTokens(str) {
      return str.split(/[\s,.\-\/]+/).filter(t => t.length > 3);
    }

    const extractedTokens = meaningfulTokens(extractedName);
    const profileTokens   = meaningfulTokens(profileName);
    const nameMatches     = extractedTokens.some(t => profileTokens.includes(t));

    if (!nameMatches) {
      resultData.flags.push({
        type: 'NAME_MISMATCH',
        description: `Name on document "${resultData.extracted_data.patient_name}" does not significantly match profile "${patient.user.first_name} ${patient.user.last_name}"`
      });
    }

    // FIX #5: Compute isClean from flags in Node — never trust the AI's is_clean value.
    const isClean = resultData.flags.length === 0;

    // --- LAYER 3: Post-OCR metadata duplicate check ---
    // Catches re-scans of the same document: different image bytes (different hash,
    // different filename) but identical (patient, category, document_date). Runs only
    // when document_date is non-null — if date is missing we raise MISSING_DATE anyway
    // and the patient will supply it in the review screen. The hash check (Layer 1) is
    // the safety net for true duplicates in the MISSING_DATE case.
    // Only runs when the document would otherwise be clean — no point marking DUPLICATE
    // on something that already needs review.
    if (isClean && resultData.extracted_data.document_date) {
      const { Op } = require('sequelize');
      const duplicate = await DocumentOcrData.findOne({
        include: [{
          model: ReportUpload,
          as: 'reportUpload',
          where: {
            patient_profile_id: patientProfileId,
            report_type: resultData.extracted_data.document_category,
            status: 'COMPLETED',
            id: { [Op.ne]: uploadId } // Don't match the current upload
          }
        }],
        where: {
          parsed_json: {
            document_date: resultData.extracted_data.document_date
          }
        }
      });

      if (duplicate) {
        await DocumentOcrData.create({
          upload_id:      uploadId,
          processed_text: 'Extracted via Claude Sonnet',
          parsed_json:    resultData.extracted_data,
          flags:          resultData.flags
        });
        await ReportUpload.update({ status: 'DUPLICATE' }, { where: { id: uploadId } });
        console.log(`Upload ${uploadId} marked DUPLICATE — matches existing completed record ${duplicate.upload_id}`);
        // No PHR rows written — profile cache is still valid, no invalidation needed.
        return; // Skip shredding entirely
      }
    }

    const status = isClean ? 'COMPLETED' : 'NEEDS_REVIEW';

    // 8. Persist raw OCR data
    await DocumentOcrData.create({
      upload_id:      uploadId,
      processed_text: 'Extracted via Claude Sonnet',
      parsed_json:    resultData.extracted_data,
      flags:          resultData.flags
    });

    // 9. Auto-shred if clean — route to the correct PHR table(s)

    // Lab Report → phr_vitals
    if (isClean && resultData.extracted_data.vitals?.length > 0) {
      const vitalsToInsert = resultData.extracted_data.vitals.map(v => ({
        patient_profile_id: patientProfileId,
        upload_id:          uploadId,
        vital_name:         v.name,
        vital_value:        v.value,
        unit:               v.unit,
        recorded_at:        resultData.extracted_data.document_date
      }));
      await PhrVital.bulkCreate(vitalsToInsert);
    }

    // Prescription → phr_medications
    if (isClean && resultData.extracted_data.medications?.length > 0) {
      const medsToInsert = resultData.extracted_data.medications.map(m => ({
        patient_profile_id: patientProfileId,
        upload_id:          uploadId,
        medication_name:    m.name,
        dosage:             m.dosage    || null,
        frequency:          m.frequency || null,
        duration:           m.duration  || null,
        prescribed_by:      resultData.extracted_data.prescribed_by || null,
        prescribed_at:      resultData.extracted_data.document_date || null,
      }));
      await PhrMedication.bulkCreate(medsToInsert);
    }

    // Discharge Summary → phr_encounters
    // Guard: only write a row if at least one meaningful field was extracted.
    // This prevents writing an all-null row when a non-Discharge document
    // correctly returns encounter: { all fields null }.
    if (isClean) {
      const enc = resultData.extracted_data.encounter;
      const hasEncounterData = enc && (
        enc.admission_date   ||
        enc.discharge_date   ||
        enc.reason_for_visit ||
        enc.attending_doctor
      );
      if (hasEncounterData) {
        await PhrEncounter.create({
          patient_profile_id:    patientProfileId,
          upload_id:             uploadId,
          admission_date:        enc.admission_date        || null,
          discharge_date:        enc.discharge_date        || null,
          reason_for_visit:      enc.reason_for_visit      || null,
          followup_instructions: enc.followup_instructions || null,
          attending_doctor:      enc.attending_doctor      || null,
        });
      }
    }

    // Imaging → phr_imaging_reports
    // Guard: only write a row if at least one meaningful field was extracted.
    if (isClean) {
      const img = resultData.extracted_data.imaging;
      const hasImagingData = img && (
        img.modality   ||
        img.body_part  ||
        img.impression ||
        img.findings
      );
      if (hasImagingData) {
        await PhrImagingReport.create({
          patient_profile_id: patientProfileId,
          upload_id:          uploadId,
          modality:           img.modality    || null,
          body_part:          img.body_part   || null,
          impression:         img.impression  || null,
          findings:           img.findings    || null,
          reported_by:        img.reported_by || null,
          report_date:        resultData.extracted_data.document_date || null,
        });
      }
    }

    // 10. Finalise status
    await ReportUpload.update({ status }, { where: { id: uploadId } });

    // 11. Invalidate Redis profile cache if PHR rows were written.
    // Only fires when isClean — NEEDS_REVIEW documents are not shredded to PHR tables,
    // so the cached profile object is still accurate and does not need busting.
    if (isClean) {
      await invalidateProfileCache(patientProfileId);
    }

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await ReportUpload.update({ status: 'FAILED' }, { where: { id: uploadId } });
    throw error;
  }
}, { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } });

worker.on('completed', job => {
  console.log(`Job ${job.id} completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
});

// FIX #3: Stalled job handler.
// BullMQ marks a job "stalled" when the worker process crashes or hangs mid-execution
// and the lock expires before the job completes. Without this handler the upload row
// stays in PROCESSING forever and the Flutter polling loop spins on it indefinitely.
//
// IMPORTANT — jobId alignment: BullMQ's stalled event receives the BullMQ job ID, which
// is an auto-incrementing string ("1", "2", ...) NOT your uploadId unless you explicitly
// set { jobId: String(uploadId) } when calling queue.add() in documentController.js.
//
// To make this handler reliable, update documentController.js queue.add() call to:
//   await documentProcessingQueue.add('extract-vitals-and-data', payload, {
//     jobId: String(newReport.id),   // <-- add this line
//     attempts: 3,
//     backoff: { type: 'exponential', delay: 2000 }
//   });
//
// With that in place, jobId === uploadId and the update below targets exactly the
// right row. Without it, the WHERE clause will find nothing (safely a no-op, but
// the stuck upload will never be unstuck).
worker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} stalled — marking upload FAILED.`);
  // jobId is "upload_<uploadId>" — strip the prefix before the DB update.
  const uploadId = Number(jobId.replace('upload_', ''));
  if (!uploadId) {
    console.error(`Stalled handler: could not parse uploadId from jobId "${jobId}"`);
    return;
  }
  ReportUpload.update(
    { status: 'FAILED' },
    { where: { id: uploadId, status: 'PROCESSING' } }
  ).catch(err => console.error('Failed to mark stalled job as FAILED:', err));
});