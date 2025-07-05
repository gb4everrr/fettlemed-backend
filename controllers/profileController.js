const { DoctorProfile, PatientProfile, ClinicAdmin, Clinic } = require('../models');

exports.createDoctorProfile = async (req, res) => {
  const { user_id, medical_reg_no, specialization } = req.body;

  try {
    const profile = await DoctorProfile.create({ user_id, medical_reg_no, specialization });
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPatientProfile = async (req, res) => {
  const { user_id, address, emergency_contact } = req.body;

  try {
    const profile = await PatientProfile.create({ user_id, address, emergency_contact });
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createClinicAdmin = async (req, res) => {
  const { user_id, clinic_id } = req.body;

  try {
    const admin = await ClinicAdmin.create({ user_id, clinic_id });
    res.status(201).json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};