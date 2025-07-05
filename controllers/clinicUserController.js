const { User, ClinicDoctor, ClinicPatient, ClinicAdmin } = require('../models');

const isAuthorizedClinicAdmin = async (user_id, clinic_id) => {
  const admin = await ClinicAdmin.findOne({ where: { user_id, clinic_id, role: ['Owner', 'Admin'], active: true } });
  return !!admin;
};

exports.addClinicDoctor = async (req, res) => {
  const { clinic_id, phone_number, first_name, last_name, email, address, specialization, medical_reg_no, started_date } = req.body;

  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const user = await User.findOne({ where: { phone_number } });

    const doctor = await ClinicDoctor.create({
      clinic_id,
      global_doctor_id: user ? user.id : null,
      phone_number,
      first_name,
      last_name,
      email,
      address,
      specialization,
      medical_reg_no,
      started_date,
      role: 'Doctor'
    });

    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicDoctors = async (req, res) => {
  const clinic_id = parseInt(req.query.clinic_id);
  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    const doctors = await ClinicDoctor.findAll({ where: { clinic_id } });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateClinicDoctor = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.body.clinic_id);
  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    await ClinicDoctor.update(req.body, { where: { id, clinic_id } });
    const updated = await ClinicDoctor.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteClinicDoctor = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.query.clinic_id);
  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    await ClinicDoctor.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Doctor removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addClinicPatient = async (req, res) => {
  const { clinic_id, phone_number, first_name, last_name, email, address, emergency_contact, patient_code, clinic_notes } = req.body;

  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const user = await User.findOne({ where: { phone_number } });

    const patient = await ClinicPatient.create({
      clinic_id,
      global_patient_id: user ? user.id : null,
      phone_number,
      first_name,
      last_name,
      email,
      address,
      emergency_contact,
      patient_code,
      clinic_notes
    });

    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicPatients = async (req, res) => {
  const clinic_id = parseInt(req.query.clinic_id);
  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    const patients = await ClinicPatient.findAll({ where: { clinic_id } });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateClinicPatient = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.body.clinic_id);
  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    await ClinicPatient.update(req.body, { where: { id, clinic_id } });
    const updated = await ClinicPatient.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteClinicPatient = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.query.clinic_id);
  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    await ClinicPatient.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Patient removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};