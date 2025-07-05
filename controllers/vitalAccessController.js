const { VitalsRecordedValue, ClinicDoctor } = require('../models');
const { Op } = require('sequelize');

exports.getVitalsForPatient = async (req, res) => {
  const { clinic_id, clinic_patient_id } = req.query;
  try {
    const isDoctor = await ClinicDoctor.findOne({
      where: { clinic_id, global_doctor_id: req.user.id, active: true }
    });

    if (!isDoctor) return res.status(403).json({ error: 'Unauthorized doctor access' });

    const vitals = await VitalsRecordedValue.findAll({
      where: { clinic_id, clinic_patient_id }
    });

    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
