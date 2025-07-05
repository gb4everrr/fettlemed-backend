const { ConsultationNote, Appointment } = require('../models');
const { isClinicDoctor } = require('../utils/authorization');

exports.addNote = async (req, res) => {
  const { appointment_id, notes } = req.body;
  try {
    const appointment = await Appointment.findByPk(appointment_id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const authorized = await isClinicDoctor(req.user.id, appointment.clinic_id);
    if (!authorized) return res.status(403).json({ error: 'Unauthorized' });

    const note = await ConsultationNote.create({
      appointment_id,
      doctor_id: req.user.id,
      patient_id: appointment.patient_id,
      clinic_id: appointment.clinic_id,
      notes
    });

    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNotesByAppointment = async (req, res) => {
  const { appointment_id } = req.params;
  try {
    const note = await ConsultationNote.findOne({ where: { appointment_id } });
    if (!note) return res.status(404).json({ error: 'No note found' });

    const authorized = await isClinicDoctor(req.user.id, note.clinic_id);
    if (!authorized) return res.status(403).json({ error: 'Unauthorized' });

    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
