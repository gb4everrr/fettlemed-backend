const { Appointment, AppointmentSlot, ClinicDoctor } = require('../models');
const { Op } = require('sequelize');
const { ClinicDoctor, Clinic } = require('../models');
const { DoctorAvailability, AvailabilityException } = require('../models');
const { isDoctorOfClinic } = require('../utils/authorization');

exports.getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // Find all clinics the doctor is associated with
    const clinicAssociations = await ClinicDoctor.findAll({
      where: { global_doctor_id: doctorId, active: true }
    });

    const clinicIds = clinicAssociations.map(row => row.clinic_id);

    // Fetch all appointments for the doctor at associated clinics
    const appointments = await Appointment.findAll({
      where: {
        doctor_id: doctorId,
        clinic_id: { [Op.in]: clinicIds }
      },
      include: [AppointmentSlot]
    });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAssociatedClinics = async (req, res) => {
  try {
    const associations = await ClinicDoctor.findAll({
      where: { global_doctor_id: req.user.id, active: true },
      include: [{ model: Clinic, attributes: ['id', 'name', 'address', 'email', 'phone'] }]
    });

    const clinics = associations.map(a => a.Clinic);
    res.json(clinics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAvailability = async (req, res) => {
  const { clinic_id, day_of_week, start_time, end_time } = req.body;
  try {
    if (!await isDoctorOfClinic(req.user.id, clinic_id))
      return res.status(403).json({ error: 'Unauthorized clinic' });

    const entry = await DoctorAvailability.create({
      global_doctor_id: req.user.id,
      clinic_id,
      day_of_week,
      start_time,
      end_time
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailability = async (req, res) => {
  const { clinic_id } = req.query;
  try {
    if (!await isDoctorOfClinic(req.user.id, clinic_id))
      return res.status(403).json({ error: 'Unauthorized clinic' });

    const availabilities = await DoctorAvailability.findAll({
      where: { global_doctor_id: req.user.id, clinic_id }
    });

    res.json(availabilities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Similar for exceptions
exports.createAvailabilityException = async (req, res) => {
  const { clinic_id, date } = req.body;
  try {
    if (!await isDoctorOfClinic(req.user.id, clinic_id))
      return res.status(403).json({ error: 'Unauthorized clinic' });

    const entry = await AvailabilityException.create({
      global_doctor_id: req.user.id,
      clinic_id,
      date
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};