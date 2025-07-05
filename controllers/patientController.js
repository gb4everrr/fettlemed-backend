const { ClinicDoctor, DoctorProfile, Clinic, AppointmentSlot, Appointment, ClinicPatient, PatientSelfData, VitalsRecordedValue, Prescription, User } = require('../models');
const { Op } = require('sequelize');

exports.getDoctorsWithClinics = async (req, res) => {
  try {
    const associations = await ClinicDoctor.findAll({
      where: { active: true },
      include: [
        {
          model: DoctorProfile,
          as: 'doctor_profile',
          attributes: ['first_name', 'last_name', 'specialization', 'email', 'phone_number']
        },
        {
          model: Clinic,
          as: 'clinic',
          attributes: ['name', 'address', 'email', 'phone']
        }
      ]
    });

    const formatted = associations.map(assoc => ({
      clinic: assoc.clinic,
      doctor: assoc.doctor_profile
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClinics = async (req, res) => {
  try {
    const clinics = await Clinic.findAll({
      attributes: ['id', 'name', 'address', 'email', 'phone']
    });
    res.json(clinics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctor_id, clinic_id } = req.query;
    const slots = await AppointmentSlot.findAll({
      where: {
        doctor_id,
        clinic_id,
        booked: false,
        slot_date: {
          [Op.gte]: new Date()
        }
      },
      order: [['slot_date', 'ASC'], ['start_time', 'ASC']]
    });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bookAppointment = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { slot_id } = req.body;

    const slot = await AppointmentSlot.findByPk(slot_id);
    if (!slot || slot.booked) {
      return res.status(400).json({ error: 'Invalid or already booked slot.' });
    }

    const clinicPatient = await ClinicPatient.findOne({
      where: {
        user_id,
        clinic_id: slot.clinic_id
      }
    });

    if (!clinicPatient) {
      return res.status(404).json({ error: 'You are not registered as a patient at this clinic.' });
    }

    const appointment = await Appointment.create({
      patient_id: clinicPatient.id,
      doctor_id: slot.doctor_id,
      clinic_id: slot.clinic_id,
      appointment_slot_id: slot.id,
      status: 1
    });

    await slot.update({ booked: true });

    res.status(201).json({ message: 'Appointment booked', appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const user_id = req.user.id;

    const clinicPatients = await ClinicPatient.findAll({
      where: { user_id }
    });

    const patientIds = clinicPatients.map(cp => cp.id);

    const appointments = await Appointment.findAll({
      where: {
        patient_id: {
          [Op.in]: patientIds
        }
      },
      include: [
        { model: Clinic, as: 'clinic', attributes: ['name', 'address'] },
        { model: AppointmentSlot, as: 'slot' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSelfData = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { data_type, data_payload, entry_date, entry_time } = req.body;

    const clinicPatient = await ClinicPatient.findOne({ where: { user_id } });
    if (!clinicPatient) return res.status(404).json({ error: 'Patient record not found' });

    const entry = await PatientSelfData.create({
      patient_id: clinicPatient.id,
      data_type,
      data_payload,
      entry_date,
      entry_time
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSelfData = async (req, res) => {
  try {
    const user_id = req.user.id;
    const clinicPatient = await ClinicPatient.findOne({ where: { user_id } });
    if (!clinicPatient) return res.status(404).json({ error: 'Patient record not found' });

    const data = await PatientSelfData.findAll({ where: { patient_id: clinicPatient.id } });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicVitals = async (req, res) => {
  try {
    const user_id = req.user.id;
    const clinicPatient = await ClinicPatient.findOne({ where: { user_id } });
    if (!clinicPatient) return res.status(404).json({ error: 'Patient record not found' });

    const vitals = await VitalsRecordedValue.findAll({
      where: { patient_id: clinicPatient.id },
      order: [['recorded_at', 'DESC']]
    });

    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSelfData = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const clinicPatient = await ClinicPatient.findOne({ where: { user_id } });
    if (!clinicPatient) return res.status(404).json({ error: 'Patient record not found' });

    const entry = await PatientSelfData.findOne({ where: { id, patient_id: clinicPatient.id } });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    await entry.update(req.body);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSelfData = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const clinicPatient = await ClinicPatient.findOne({ where: { user_id } });
    if (!clinicPatient) return res.status(404).json({ error: 'Patient record not found' });

    const entry = await PatientSelfData.findOne({ where: { id, patient_id: clinicPatient.id } });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    await entry.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyPrescriptions = async (req, res) => {
  try {
    const user_id = req.user.id;

    const clinicPatients = await ClinicPatient.findAll({
      where: { user_id }
    });

    const clinicPatientIds = clinicPatients.map(cp => cp.id);

    const prescriptions = await Prescription.findAll({
      where: {
        patient_id: {
          [Op.in]: clinicPatientIds
        }
      },
      include: [
        { model: User, as: 'doctor', attributes: ['full_name'] }
      ],
      order: [['signed_at', 'DESC']]
    });

    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rescheduleAppointment = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params; // appointment id
    const { new_slot_id } = req.body;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const newSlot = await AppointmentSlot.findByPk(new_slot_id);
    if (!newSlot || newSlot.booked) return res.status(400).json({ error: 'Invalid or already booked slot.' });

    const clinicPatient = await ClinicPatient.findOne({
      where: {
        id: appointment.patient_id,
        user_id,
        clinic_id: appointment.clinic_id
      }
    });
    if (!clinicPatient) return res.status(403).json({ error: 'Not authorized to modify this appointment.' });

    const oldSlot = await AppointmentSlot.findByPk(appointment.appointment_slot_id);
    if (oldSlot) await oldSlot.update({ booked: false });
    await newSlot.update({ booked: true });

    await appointment.update({ appointment_slot_id: new_slot_id });

    res.json({ message: 'Appointment rescheduled', appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


