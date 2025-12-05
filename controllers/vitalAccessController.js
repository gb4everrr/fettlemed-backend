const { VitalsRecordedValue, ClinicDoctor } = require('../models');
const { Op } = require('sequelize');

exports.getVitalsForPatient = async (req, res) => {
  const { clinic_id, clinic_patient_id } = req.query;
  try {
    

    const vitals = await VitalsRecordedValue.findAll({
      where: { clinic_id, clinic_patient_id }
    });

    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
