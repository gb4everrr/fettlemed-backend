const { Clinic, ClinicAdmin } = require('../models');

exports.createClinic = async (req, res) => {
  const { name, address, email, phone } = req.body;
  const user_id = req.user.id; // assuming JWT middleware sets req.user

  try {
    const clinic = await Clinic.create({ name, address, email, phone });

    await ClinicAdmin.create({
      user_id,
      clinic_id: clinic.id,
      role: 'Owner',
      active: true
    });

    res.status(201).json({ message: 'Clinic created', clinic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllClinics = async (req, res) => {
  try {
    const clinics = await Clinic.findAll();
    res.json(clinics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyClinics = async (req, res) => {
  const user_id = req.user.id;

  try {
    const clinics = await Clinic.findAll({
      include: {
        model: ClinicAdmin,
        where: { user_id },
        attributes: []
      }
    });
    res.json(clinics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};