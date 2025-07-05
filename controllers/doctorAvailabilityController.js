const { DoctorAvailability, AvailabilityException, ClinicAdmin, ClinicDoctor } = require('../models');
const { generateSlots, removeSlotsByDate, generateSlotsFor3Months } = require('../utils/slotUtils');

const isAuthorized = async (userId, clinicId) => {
  const isAdmin = await ClinicAdmin.findOne({ where: { user_id: userId, clinic_id: clinicId, active: true } });
  if (isAdmin) return true;
  const isDoctor = await ClinicDoctor.findOne({ where: { global_doctor_id: userId, clinic_id: clinicId, active: true } });
  return !!isDoctor;
};

exports.addAvailability = async (req, res) => {
  const { doctor_id, clinic_id, day_of_week, start_time, end_time } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    const record = await DoctorAvailability.create({ doctor_id, clinic_id, day_of_week, start_time, end_time });
    await generateSlotsFor3Months({ doctor_id, clinic_id, day_of_week, start_time, end_time });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAvailability = async (req, res) => {
  const { id } = req.params;
  const { clinic_id, ...updates } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    await DoctorAvailability.update(updates, { where: { id, clinic_id } });
    await generateSlotsFor3Months({ ...updates, clinic_id });
    res.json({ message: 'Availability updated and slots regenerated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailability = async (req, res) => {
  const { clinic_id } = req.query;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    const records = await DoctorAvailability.findAll({ where: { clinic_id } });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAvailability = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.query;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    await DoctorAvailability.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Availability deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addException = async (req, res) => {
  const { doctor_id, clinic_id, date, is_available, note } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    await AvailabilityException.create({ doctor_id, clinic_id, date, is_available, note });

    if (!is_available) {
      await removeSlotsByDate({ doctor_id, clinic_id, date });
    } else {
      await generateSlots({ doctor_id, clinic_id, date, start_time: '09:00', end_time: '17:00' });
    }

    res.status(201).json({ message: 'Exception recorded and slots updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getExceptions = async (req, res) => {
  const { clinic_id } = req.query;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    const exceptions = await AvailabilityException.findAll({ where: { clinic_id } });
    res.json(exceptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteException = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.query;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    await AvailabilityException.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Exception removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};