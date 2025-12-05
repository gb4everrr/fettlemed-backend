const { Prescription, Appointment } = require('../models');


exports.addPrescription = async (req, res) => {
  const { appointment_id, medicines, notes } = req.body;
  try {
    const appointment = await Appointment.findByPk(appointment_id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    

    const prescription = await Prescription.create({
      appointment_id,
      doctor_id: req.user.id,
      patient_id: appointment.patient_id,
      clinic_id: appointment.clinic_id,
      medicines: JSON.stringify(medicines),
      notes
    });

    res.status(201).json(prescription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPrescription = async (req, res) => {
  const { appointment_id } = req.params;
  try {
    const prescription = await Prescription.findOne({ where: { appointment_id } });
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    

    res.json(prescription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
