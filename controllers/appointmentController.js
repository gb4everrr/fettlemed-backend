const { Appointment, AppointmentSlot, ClinicAdmin, ClinicDoctor } = require('../models');
const { Op } = require('sequelize');

const isAuthorized = async (userId, clinicId) => {
  const isAdmin = await ClinicAdmin.findOne({ where: { user_id: userId, clinic_id, active: true } });
  if (isAdmin) return true;
  const isDoctor = await ClinicDoctor.findOne({ where: { global_doctor_id: userId, clinic_id, active: true } });
  return !!isDoctor;
};

exports.createAppointment = async (req, res) => {
  const { doctor_id, clinic_id, patient_id, appointment_slot_id, notes } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });

    const slot = await AppointmentSlot.findByPk(appointment_slot_id);
    if (!slot || slot.is_booked) return res.status(400).json({ error: 'Slot unavailable' });

    const appointment = await Appointment.create({ doctor_id, clinic_id, patient_id, appointment_slot_id, notes });
    await slot.update({ is_booked: true });
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAppointment = async (req, res) => {
  const { id } = req.params;
  const { clinic_id, notes } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    await Appointment.update({ notes }, { where: { id, clinic_id } });
    const updated = await Appointment.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelAppointment = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.query;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    await appointment.update({ status: 2 });
    await AppointmentSlot.update({ is_booked: false }, { where: { id: appointment.appointment_slot_id } });

    res.json({ message: 'Appointment cancelled and slot freed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleConfirmation = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.query;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const newStatus = appointment.status === 1 ? 0 : 1;
    await appointment.update({ status: newStatus });
    res.json({ message: `Appointment ${newStatus === 1 ? 'confirmed' : 'set to pending'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAppointments = async (req, res) => {
  const { clinic_id, doctor_id, patient_id } = req.query;
  try {
    if (clinic_id) {
      if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized clinic view' });
      const appointments = await Appointment.findAll({ where: { clinic_id } });
      return res.json(appointments);
    }
    if (doctor_id) {
      const isDoctor = await ClinicDoctor.findOne({ where: { global_doctor_id: req.user.id, clinic_id: doctor_id, active: true } });
      if (!isDoctor) return res.status(403).json({ error: 'Unauthorized doctor view' });
      const appointments = await Appointment.findAll({ where: { doctor_id } });
      return res.json(appointments);
    }
    if (patient_id && parseInt(patient_id) === req.user.id) {
      const appointments = await Appointment.findAll({ where: { patient_id } });
      return res.json(appointments);
    }
    return res.status(400).json({ error: 'Invalid query' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};