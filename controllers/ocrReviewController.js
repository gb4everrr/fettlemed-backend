const {
  ReportUpload, DocumentOcrData,
  PhrVital, PhrMedication, PhrEncounter, PhrImagingReport,
  PatientProfile
} = require('../models');

exports.getReviewData = async (req, res) => {
  console.log('🔍 Fetching Review for ID:', req.params.uploadId, 'User:', req.user.id);

  try {
    const { uploadId } = req.params;
    const userId = req.user.id;

    const profile = await PatientProfile.findOne({ where: { user_id: userId } });
    if (!profile) {
      console.log('❌ Profile not found for User:', userId);
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const upload = await ReportUpload.findOne({
      where: { id: uploadId, patient_profile_id: profile.id }
    });
    if (!upload) {
      console.log('❌ Document not found for Profile:', profile.id);
      return res.status(404).json({ error: 'Document not found' });
    }

    const ocrData = await DocumentOcrData.findOne({ where: { upload_id: uploadId } });
    if (!ocrData) {
      console.log('❌ OCR Data entry missing for Upload:', uploadId);
      return res.status(404).json({ error: 'OCR data not found' });
    }

    console.log('✅ Successfully sending OCR data');
    res.status(200).json({ data: ocrData });

  } catch (error) {
    console.error('🔥 SERVER CRASH:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.resolveReviewData = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { final_data, is_confirmed_owner } = req.body;
    const userId = req.user.id;

    // 1. Get Profile ID
    const profile = await PatientProfile.findOne({ where: { user_id: userId } });

    // 2. Verify ownership
    const upload = await ReportUpload.findOne({
      where: { id: uploadId, patient_profile_id: profile.id }
    });
    if (!upload) return res.status(404).json({ error: 'Document not found' });

    // 3. Handle identity rejection — mark complete, shred nothing
    if (!is_confirmed_owner) {
      await ReportUpload.update({ status: 'COMPLETED' }, { where: { id: uploadId } });
      return res.status(200).json({ message: 'Marked as external. No data shredded.' });
    }

    // 4. Persist the patient-reviewed & corrected data, clear flags
    await DocumentOcrData.update(
      { parsed_json: final_data, flags: [] },
      { where: { upload_id: uploadId } }
    );

    // 5. Shred → phr_vitals (Lab Report)
    if (final_data.vitals && final_data.vitals.length > 0) {
      const vitalsToInsert = final_data.vitals.map(v => ({
        patient_profile_id: profile.id,
        upload_id:          uploadId,
        vital_name:         v.name,
        vital_value:        v.value,
        unit:               v.unit,
        recorded_at:        final_data.document_date || upload.uploaded_at
      }));
      await PhrVital.bulkCreate(vitalsToInsert);
    }

    // 6. Shred → phr_medications (Prescription)
    if (final_data.medications && final_data.medications.length > 0) {
      const medsToInsert = final_data.medications.map(m => ({
        patient_profile_id: profile.id,
        upload_id:          uploadId,
        medication_name:    m.name,
        dosage:             m.dosage    || null,
        frequency:          m.frequency || null,
        duration:           m.duration  || null,
        prescribed_by:      final_data.prescribed_by || null,
        prescribed_at:      final_data.document_date || upload.uploaded_at,
      }));
      await PhrMedication.bulkCreate(medsToInsert);
    }

    // 7. Shred → phr_encounters (Discharge Summary)
    // Guard: only write if at least one meaningful field is present
    const enc = final_data.encounter;
    const hasEncounterData = enc && (
      enc.admission_date   ||
      enc.discharge_date   ||
      enc.reason_for_visit ||
      enc.attending_doctor
    );
    if (hasEncounterData) {
      await PhrEncounter.create({
        patient_profile_id:    profile.id,
        upload_id:             uploadId,
        admission_date:        enc.admission_date        || null,
        discharge_date:        enc.discharge_date        || null,
        reason_for_visit:      enc.reason_for_visit      || null,
        followup_instructions: enc.followup_instructions || null,
        attending_doctor:      enc.attending_doctor      || null,
      });
    }

    // 8. Shred → phr_imaging_reports (Imaging)
    // Guard: only write if at least one meaningful field is present
    const img = final_data.imaging;
    const hasImagingData = img && (
      img.modality   ||
      img.body_part  ||
      img.impression ||
      img.findings
    );
    if (hasImagingData) {
      await PhrImagingReport.create({
        patient_profile_id: profile.id,
        upload_id:          uploadId,
        modality:           img.modality    || null,
        body_part:          img.body_part   || null,
        impression:         img.impression  || null,
        findings:           img.findings    || null,
        reported_by:        img.reported_by || null,
        report_date:        final_data.document_date || upload.uploaded_at,
      });
    }

    // 9. Finalise status
    await ReportUpload.update({ status: 'COMPLETED' }, { where: { id: uploadId } });

    res.status(200).json({ message: 'Review resolved successfully', status: 'COMPLETED' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to resolve review' });
  }
};

// FIX #2 — CATEGORY_MISMATCH: patches report_upload.report_type when the
// patient corrects a misidentified category in the review screen.
// Called by Flutter BEFORE resolveReviewData so the shredding logic in
// resolveReviewData routes to the correct PHR table.
// Route: PATCH /documents/:uploadId/category
exports.patchCategory = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { report_type } = req.body;
    const userId = req.user.id;

    if (!report_type) {
      return res.status(400).json({ error: 'report_type is required' });
    }

    const validCategories = ['Lab Report', 'Prescription', 'Imaging', 'Discharge Summary'];
    if (!validCategories.includes(report_type)) {
      return res.status(400).json({ error: `report_type must be one of: ${validCategories.join(', ')}` });
    }

    // Verify the upload belongs to this patient before allowing the patch
    const profile = await PatientProfile.findOne({ where: { user_id: userId } });
    if (!profile) return res.status(404).json({ error: 'Patient profile not found' });

    const updated = await ReportUpload.update(
      { report_type },
      { where: { id: uploadId, patient_profile_id: profile.id } }
    );

    if (updated[0] === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({ message: 'Category updated', report_type });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};