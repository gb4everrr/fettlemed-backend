// controllers/documentSummaryController.js
//
// GET /documents/:uploadId/summary
//
// Returns a typed summary of the extracted PHR data for a COMPLETED document,
// keyed by report_type. Only serves COMPLETED documents — returns 404 for all
// other statuses (NEEDS_REVIEW data lives in document_ocr_data, not PHR tables).
//
// Response shape:
// {
//   "report_type": "Lab Report",
//   "document_date": "2024-03-10",   // may be null for older rows
//   "data": {
//     // Lab Report:
//     "vitals": [{ "name": "HbA1c", "value": "7.2", "unit": "%" }]
//
//     // Prescription:
//     "medications": [{ "name": "Metformin", "dosage": "500mg", "frequency": "Twice daily", "duration": "30 days" }],
//     "prescribed_by": "Dr. Sharma"
//
//     // Discharge Summary:
//     "encounter": { "admission_date": "...", "discharge_date": "...", "reason_for_visit": "...", "attending_doctor": "...", "followup_instructions": "..." }
//
//     // Imaging — impression & findings intentionally OMITTED (AI-generated,
//     // presenting as fact to a patient is misleading and potentially harmful):
//     "imaging": { "modality": "X-Ray", "body_part": "Chest" }
//   }
// }

const {
  ReportUpload,
  PhrVital,
  PhrMedication,
  PhrEncounter,
  PhrImagingReport,
  PatientProfile,
} = require('../models');

exports.getDocumentSummary = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const userId = req.user.id;

    // 1. Resolve patient profile — all queries are scoped to this patient.
    const profile = await PatientProfile.findOne({ where: { user_id: userId } });
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    // 2. Verify the upload belongs to this patient and is COMPLETED.
    //    We only serve PHR data for COMPLETED documents. NEEDS_REVIEW documents
    //    have not been shredded into PHR tables yet, so there is nothing to return.
    //    DUPLICATE documents were intentionally not shredded either.
    const upload = await ReportUpload.findOne({
      where: {
        id: uploadId,
        patient_profile_id: profile.id,
        status: 'COMPLETED',
      },
    });

    if (!upload) {
      // Return 404 whether the document doesn't exist, belongs to another patient,
      // or simply isn't COMPLETED yet — no information leakage.
      return res.status(404).json({ error: 'Document not found or not yet completed' });
    }

    const reportType = upload.report_type;
    let data = {};

    // 3. Query the correct PHR table based on report_type.
    //    Each branch returns only the fields the Flutter UI is permitted to display.

    if (reportType === 'Lab Report') {
      const vitals = await PhrVital.findAll({
        where: { upload_id: uploadId },
        attributes: ['vital_name', 'vital_value', 'unit', 'recorded_at'],
        order: [['vital_name', 'ASC']],
      });

      data.vitals = vitals.map(v => ({
        name: v.vital_name,
        value: v.vital_value,
        unit: v.unit ?? '',
      }));

    } else if (reportType === 'Prescription') {
      const meds = await PhrMedication.findAll({
        where: { upload_id: uploadId },
        attributes: ['medication_name', 'dosage', 'frequency', 'duration', 'prescribed_by', 'prescribed_at'],
        order: [['medication_name', 'ASC']],
      });

      // prescribed_by is stored on each medication row but is the same for all —
      // lift it to the top level to match the Flutter model.
      data.medications = meds.map(m => ({
        name: m.medication_name,
        dosage: m.dosage ?? '',
        frequency: m.frequency ?? '',
        duration: m.duration ?? '',
      }));
      data.prescribed_by = meds[0]?.prescribed_by ?? null;

    } else if (reportType === 'Discharge Summary') {
      const encounter = await PhrEncounter.findOne({
        where: { upload_id: uploadId },
        attributes: [
          'admission_date',
          'discharge_date',
          'reason_for_visit',
          'attending_doctor',
          'followup_instructions',
        ],
      });

      data.encounter = encounter
        ? {
            admission_date: encounter.admission_date ?? null,
            discharge_date: encounter.discharge_date ?? null,
            reason_for_visit: encounter.reason_for_visit ?? null,
            attending_doctor: encounter.attending_doctor ?? null,
            followup_instructions: encounter.followup_instructions ?? null,
          }
        : null;

    } else if (reportType === 'Imaging') {
      const imaging = await PhrImagingReport.findOne({
        where: { upload_id: uploadId },
        // INTENTIONALLY omitting impression & findings — these are AI-generated
        // summaries. Presenting them as clinical fact to a patient is misleading
        // and potentially harmful. Only show modality and body_part.
        attributes: ['modality', 'body_part'],
      });

      data.imaging = imaging
        ? {
            modality: imaging.modality ?? null,
            body_part: imaging.body_part ?? null,
          }
        : null;
    }

    // 4. Derive document_date from the PHR row most likely to have it.
    //    We use upload.uploaded_at as a fallback since the original document_date
    //    is not stored on report_upload itself.
    let documentDate = null;
    if (reportType === 'Lab Report' && data.vitals?.length > 0) {
      const vital = await PhrVital.findOne({
        where: { upload_id: uploadId },
        attributes: ['recorded_at'],
      });
      documentDate = vital?.recorded_at ?? null;
    } else if (reportType === 'Prescription') {
      const med = await PhrMedication.findOne({
        where: { upload_id: uploadId },
        attributes: ['prescribed_at'],
      });
      documentDate = med?.prescribed_at ?? null;
    } else if (reportType === 'Discharge Summary' && data.encounter) {
      documentDate = data.encounter.discharge_date ?? data.encounter.admission_date ?? null;
    } else if (reportType === 'Imaging') {
      const img = await PhrImagingReport.findOne({
        where: { upload_id: uploadId },
        attributes: ['report_date'],
      });
      documentDate = img?.report_date ?? null;
    }

    return res.status(200).json({
      report_type: reportType,
      document_date: documentDate,
      data,
    });

  } catch (error) {
    console.error('Error fetching document summary:', error);
    return res.status(500).json({ error: 'Failed to fetch document summary' });
  }
};