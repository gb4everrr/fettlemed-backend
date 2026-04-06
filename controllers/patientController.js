const { ClinicDoctor, DoctorProfile, Clinic, AppointmentSlot, Appointment, ClinicPatient, PatientSelfData, PatientProfile, VitalsRecordedValue, Prescription, User,DoctorAvailability, VitalsEntry, ClinicVitalConfig, AppointmentDiagnosis, PatientAllergy, sequelize } = require('../models');
const { Op } = require('sequelize');
const { fromZonedTime } = require('date-fns-tz');

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

exports.saveOnboardingData = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const user_id = req.user.id;
    const { 
      date_of_birth, 
      gender, 
      blood_type, 
      emergency_contact, 
      medical_history 
    } = req.body;

    // 1. Update or Create PatientProfile (Global Variables)
    let [profile] = await PatientProfile.findOrCreate({
      where: { user_id },
      defaults: { user_id },
      transaction
    });

    await profile.update({
      date_of_birth,
      gender,
      blood_type,
      emergency_contact
    }, { transaction });

    // 2. Save Medical History (JSONB) Directly to Global PatientProfile
    if (medical_history) {
      // Check if a medical_history record already exists for this global profile
      let selfData = await PatientSelfData.findOne({
        where: { 
          patient_profile_id: profile.id, // Linking globally!
          data_type: 'medical_history' 
        },
        transaction
      });

      if (selfData) {
        // Update existing JSON data
        await selfData.update({ 
          data: medical_history,
          entry_time: new Date() 
        }, { transaction });
      } else {
        // Create new JSON data entry
        await PatientSelfData.create({
          patient_profile_id: profile.id,
          data_type: 'medical_history',
          data: medical_history,
          entry_time: new Date()
        }, { transaction });
      }
    }

    await transaction.commit();
    res.status(200).json({ message: 'Onboarding data saved successfully', profile });

  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.getMedicalProfile = async (req, res) => {
  try {
    const user_id = req.user.id;

    // 1. Fetch Global Profile
    const profile = await PatientProfile.findOne({ 
      where: { user_id },
      attributes: ['id', 'date_of_birth', 'gender', 'blood_type', 'emergency_contact']
    });

    // 2. Fetch Medical History JSON
    // CRITICAL FIX: Use optional chaining or a null check to prevent 500 crash
    let medicalHistoryRow = null;
    if (profile) {
      medicalHistoryRow = await PatientSelfData.findOne({
        where: { 
          patient_profile_id: profile.id, 
          data_type: 'medical_history' 
        }
      });
    }

    // 3. Return the data
    res.json({
      profile: profile || {},
      // We return the content of the 'data' column specifically
      medical_history: medicalHistoryRow ? medicalHistoryRow.data : {}
    });
  } catch (err) {
    console.error("GET_PROFILE_ERROR:", err); // Check your server terminal for this!
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicVitals = async (req, res) => {
  try {
    // 1. Use the correct global_patient_id mapping
    const global_patient_id = req.user.id; 

    const patientProfiles = await ClinicPatient.findAll({ 
      where: { global_patient_id: global_patient_id },
      attributes: ['id']
    });

    if (!patientProfiles || patientProfiles.length === 0) {
      return res.json([]); 
    }

    const clinicPatientIds = patientProfiles.map(p => p.id);

    // 2. Fetch Entries and INCLUDE the Config to get names and units
    const entries = await VitalsEntry.findAll({
      where: { clinic_patient_id: { [Op.in]: clinicPatientIds } },
      order: [['entry_date', 'DESC'], ['entry_time', 'DESC']], // Latest first
      include: [{
        model: VitalsRecordedValue,
        as: 'values', // Make sure this alias matches your associations
        include: [{
          model: ClinicVitalConfig,
          as: 'config',
          attributes: ['vital_name', 'unit']
        }]
      }]
    });

    // 3. Extract and Deduplicate (Keep only the latest of each vital type)
    const latestVitals = [];
    const seenVitalTypes = new Set();

    entries.forEach(entry => {
      if (entry.values && entry.values.length > 0) {
        entry.values.forEach(val => {
          if (val.config && val.config.vital_name) {
            const vitalType = val.config.vital_name.toLowerCase();
            
            // If we haven't seen this vital type yet, add it
            if (!seenVitalTypes.has(vitalType)) {
              seenVitalTypes.add(vitalType);
              
              latestVitals.push({
                vital_name: val.config.vital_name,
                vital_value: val.vital_value,
                unit: val.config.unit,
                date_recorded: entry.entry_date
              });
            }
          }
        });
      }
    });

    // 4. Return strictly the top 4 latest, unique vitals to power the UI blocks
    res.json(latestVitals.slice(0, 4));

  } catch (err) {
    console.error('Error fetching clinic vitals:', err);
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
    // 1. Correct mapping using global_patient_id
    const global_patient_id = req.user.id;

    const clinicPatients = await ClinicPatient.findAll({
      where: { global_patient_id: global_patient_id },
      attributes: ['id']
    });

    if (!clinicPatients || clinicPatients.length === 0) {
      return res.json([]); // No patient profiles found
    }

    const clinicPatientIds = clinicPatients.map(cp => cp.id);

    // 2. Fetch Prescriptions with exact matching column names
    const prescriptions = await Prescription.findAll({
      where: {
        clinic_patient_id: {
          [Op.in]: clinicPatientIds
        }
      },
      // Ensure we sort latest to earliest for the UI
      order: [['created_at', 'DESC']]
    });

    res.json(prescriptions);
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.rescheduleAppointment = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params; // appointment id
    const { new_slot_id, datetime_start, datetime_end } = req.body;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // 1. Authorize the patient
    const clinicPatient = await ClinicPatient.findOne({
      where: {
        id: appointment.clinic_patient_id,
        global_patient_id: user_id,
        clinic_id: appointment.clinic_id
      }
    });
    if (!clinicPatient) return res.status(403).json({ error: 'Not authorized to modify this appointment.' });

    // 2. Validate the New Slot (Handle both Physical DB Slots and Virtual Slots)
    if (new_slot_id) {
      // If we have a hard ID from the database
      const newSlot = await AppointmentSlot.findByPk(new_slot_id);
      if (!newSlot || newSlot.booked) return res.status(400).json({ error: 'Invalid or already booked slot.' });
      await newSlot.update({ booked: true });
    } else if (datetime_start && datetime_end) {
      // If it's a virtual slot, do an overlap check to ensure the doctor is free
      const overlap = await Appointment.findOne({
        where: {
          clinic_doctor_id: appointment.clinic_doctor_id,
          id: { [Op.ne]: appointment.id }, // Ignore the current appointment
          status: { [Op.notIn]: [4] }, // Ignore cancelled
          datetime_start: { [Op.lt]: datetime_end },
          datetime_end: { [Op.gt]: datetime_start }
        }
      });
      if (overlap) return res.status(400).json({ error: 'Invalid or already booked slot.' });
    } else {
      return res.status(400).json({ error: 'Must provide new_slot_id or new datetime boundaries.' });
    }

    // 3. Free up the OLD slot (if it existed)
    if (appointment.appointment_slot_id) {
      const oldSlot = await AppointmentSlot.findByPk(appointment.appointment_slot_id);
      if (oldSlot) await oldSlot.update({ booked: false });
    }

    // ✨ 4. THE FIX: Explicitly set and save the new data ✨
    appointment.appointment_slot_id = new_slot_id ? new_slot_id : null;
    appointment.datetime_start = new Date(datetime_start);
    appointment.datetime_end = new Date(datetime_end);
    appointment.status = 0; // Optional: Reset status to 'Booked/Confirmed' just in case

    // Force the database to save these exact values
    await appointment.save();

    res.json({ message: 'Appointment rescheduled', appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchCare = async (req, res) => {
  const q = req.query.q ? req.query.q.trim() : '';

  try {
    let whereClause = { active: true };

    if (q) {
      // User is actively searching
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${q}%` } },
        { last_name: { [Op.iLike]: `%${q}%` } },
        { specialization: { [Op.iLike]: `%${q}%` } },
        { '$Clinic.name$': { [Op.iLike]: `%${q}%` } } 
      ];
    } else {
      // Default view: Find doctors available TODAY
      const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
      
      const availabilities = await DoctorAvailability.findAll({
        where: { weekday: todayName, active: true },
        attributes: ['clinic_doctor_id']
      });
      
      const doctorIds = availabilities.map(a => a.clinic_doctor_id);
      
      if (doctorIds.length > 0) {
        whereClause.id = { [Op.in]: doctorIds };
      } else {
        // No doctors have shifts scheduled for today
        return res.json([]);
      }
    }

    const searchResults = await ClinicDoctor.findAll({
      where: whereClause,
      include: [
        {
          model: Clinic,
          as: 'Clinic', 
          attributes: ['id', 'name', 'address', 'timezone']
        }
      ],
      limit: 30
    });

    const formattedResults = searchResults.map(cd => ({
      clinic_doctor_id: cd.id,
      clinic_id: cd.clinic_id,
      first_name: cd.first_name,
      last_name: cd.last_name,
      specialization: cd.specialization || 'General Practice',
      clinic_name: cd.Clinic?.name || 'Unknown Clinic',
      clinic_address: cd.Clinic?.address || '',
      clinic_timezone: cd.Clinic?.timezone || 'UTC',
      phone_number: cd.phone_number 
    }));

    res.json(formattedResults);
  } catch (err) {
    console.error('[SearchCare] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctor_id, clinic_id, date } = req.query;

    if (!doctor_id || !clinic_id || !date) {
      return res.status(400).json({ error: 'Missing doctor_id, clinic_id, or date' });
    }

    // 1. Get Clinic Timezone
    const clinic = await Clinic.findByPk(clinic_id);
    const timeZone = clinic?.timezone || 'Asia/Kolkata'; // Default fallback

    const targetDate = new Date(`${date}T00:00:00`);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdays[targetDate.getDay()];

    const availability = await DoctorAvailability.findOne({
      where: { clinic_doctor_id: doctor_id, clinic_id: clinic_id, weekday: weekday, active: true }
    });

    if (!availability) return res.json([]);

    // 2. ✨ PROPER TIMEZONE CONVERSION TO UTC ✨
    // We combine the date and time, then use fromZonedTime to convert Clinic Local Time -> UTC
    const shiftStartStr = `${date}T${availability.start_time}`;
    const shiftEndStr = `${date}T${availability.end_time}`;
    
    const shiftStart = fromZonedTime(shiftStartStr, timeZone);
    const shiftEnd = fromZonedTime(shiftEndStr, timeZone);

    const startOfDay = fromZonedTime(`${date}T00:00:00`, timeZone);
    const endOfDay = fromZonedTime(`${date}T23:59:59`, timeZone);

    const existingAppointments = await Appointment.findAll({
      where: {
        clinic_doctor_id: doctor_id,
        clinic_id: clinic_id,
        datetime_start: { [Op.gte]: startOfDay, [Op.lt]: endOfDay },
        status: { [Op.not]: 3 }
      }
    });

    const availableSlots = [];
    const slotDurationMs = 30 * 60 * 1000; 

    let currentSlot = shiftStart.getTime();
    const shiftEndTime = shiftEnd.getTime();

    while (currentSlot + slotDurationMs <= shiftEndTime) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(currentSlot + slotDurationMs);

      const isBooked = existingAppointments.some(appt => {
        const apptStart = new Date(appt.datetime_start).getTime();
        const apptEnd = new Date(appt.datetime_end).getTime();
        return (slotStart.getTime() < apptEnd) && (slotEnd.getTime() > apptStart);
      });

      if (!isBooked) {
        availableSlots.push({
          id: null, 
          clinic_id: parseInt(clinic_id),
          clinic_doctor_id: parseInt(doctor_id),
          start_time: slotStart.toISOString(), // Now sends true UTC! (e.g., 03:30:00.000Z)
          end_time: slotEnd.toISOString(),
          booked: false
        });
      }

      currentSlot += slotDurationMs;
    }

    res.json(availableSlots);
  } catch (err) {
    console.error('[PatientController - getAvailableSlots] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.bookAppointment = async (req, res) => {
  try {
    const { 
      clinic_id, 
      clinic_doctor_id, 
      slot_id, 
      datetime_start, 
      datetime_end, 
      appointment_type, 
      notes 
    } = req.body;

    const global_patient_id = req.user.id; 

    if (!clinic_id || !clinic_doctor_id || !datetime_start || !datetime_end) {
      return res.status(400).json({ error: 'Missing required appointment fields' });
    }

    // 1. Find or Create the Clinic Patient
    const [clinicPatient, created] = await ClinicPatient.findOrCreate({
      where: { clinic_id: clinic_id, global_patient_id: global_patient_id },
      defaults: {
        first_name: req.user.first_name || 'New',
        last_name: req.user.last_name || 'Patient',
        email: req.user.email,
        phone_number: req.user.phone_number
      }
    });

    // 2. ✨ MATERIALIZE THE SLOT ✨
    let final_slot_id = slot_id;
    if (!final_slot_id) {
      // Create the physical slot in the database
      const newSlot = await AppointmentSlot.create({
        clinic_id,
        clinic_doctor_id,
        start_time: datetime_start,
        end_time: datetime_end,
        booked: true
      });
      final_slot_id = newSlot.id;
    } else {
      // Or update existing slot
      await AppointmentSlot.update({ booked: true }, { where: { id: final_slot_id } });
    }

    // 3. Create the Appointment WITH the slot_id populated
    const appointment = await Appointment.create({
      clinic_id,
      clinic_patient_id: clinicPatient.id,
      clinic_doctor_id,
      slot_id: final_slot_id, // <-- Now strictly referenced!
      datetime_start,
      datetime_end,
      appointment_type: appointment_type || 0,
      status: 0,
      notes: notes || null
    });

    const confirmedAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        { model: ClinicDoctor, as: 'doctor', attributes: ['first_name', 'last_name', 'specialization'] },
        { model: Clinic, as: 'clinic', attributes: ['name', 'address'] }
      ]
    });

    res.status(201).json(confirmedAppointment);
  } catch (err) {
    console.error('[PatientController - bookAppointment] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPaginatedPatientAppointments = async (req, res) => {
  try {
    // We can use req.user.id directly from the auth token for absolute security,
    // but we will also accept req.params.id as a fallback based on your route setup.
    const userId = req.user ? req.user.id : req.params.id; 
    
    const { page = 1, limit = 15, search = '', date = '' } = req.query;
    const offset = (page - 1) * limit;

    // ✨ STEP 1: Map Global User ID to all of their ClinicPatient profiles
    const clinicPatients = await ClinicPatient.findAll({
      where: { global_patient_id: userId },
      attributes: ['id'] // We only need the ID
    });

    const clinicPatientIds = clinicPatients.map(cp => cp.id);

    // If they aren't registered at any clinics, they have no appointments.
    if (clinicPatientIds.length === 0) {
      return res.json({
        data: [],
        total: 0,
        page: parseInt(page),
        totalPages: 0
      });
    }

    // ✨ STEP 2: Find appointments matching ANY of their clinic_patient_ids
    const whereClause = { 
      clinic_patient_id: { [Op.in]: clinicPatientIds } 
    };

    // Strict Date Filtering
    if (date) {
      const startDate = new Date(`${date}T00:00:00.000Z`);
      const endDate = new Date(`${date}T23:59:59.999Z`);
      whereClause.datetime_start = { [Op.between]: [startDate, endDate] };
    }

    // Server-Side Search logic (Doctor or Clinic Name)
    if (search) {
      whereClause[Op.or] = [
        { '$doctor.first_name$': { [Op.iLike]: `%${search}%` } },
        { '$doctor.last_name$': { [Op.iLike]: `%${search}%` } },
        { '$clinic.name$': { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where: whereClause,
      include: [
        { model: ClinicDoctor, as: 'doctor', attributes: ['first_name', 'last_name', 'specialization'] },
        { model: Clinic, as: 'clinic', attributes: ['name', 'address', 'timezone'] } 
      ],
      order: [['datetime_start', 'DESC']], // Most recent to oldest
      limit: parseInt(limit),
      offset: parseInt(offset),
      subQuery: false // Required when using Op.or on included models
    });

    res.json({
      data: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error('Pagination Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 1. Fetch Aggregated Appointment Details
exports.getPatientAppointmentDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // Assuming authenticate middleware sets req.user

  try {
    // 1. Get the core appointment (Verify ownership implicitly via patient clinic links if needed)
    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: ClinicDoctor, as: 'doctor', attributes: ['first_name', 'last_name', 'specialization'] },
        { model: Clinic, as: 'clinic', attributes: ['name', 'address', 'timezone', 'phone'] }
      ]
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // 2. Get Prescriptions for this appointment
    const prescriptions = await Prescription.findAll({
      where: { appointment_id: id },
      attributes: ['id', 'drug_name', 'dose', 'frequency', 'duration', 'instructions'],
      order: [['created_at', 'ASC']]
    });

    // 3. Get Vitals for this appointment
    const vitals = await VitalsEntry.findAll({
      where: { appointment_id: id },
      attributes: ['id', 'entry_date', 'entry_time'],
      include: [{
        model: VitalsRecordedValue,
        as: 'values',
        attributes: ['vital_value'],
        include: [{
          model: ClinicVitalConfig,
          as: 'config',
          attributes: ['vital_name', 'unit']
        }]
      }],
      order: [['entry_date', 'DESC'], ['entry_time', 'DESC']]
    });

    // Format Vitals into a cleaner array for the mobile app
    const formattedVitals = vitals.map(v => ({
      entry_id: v.id,
      date: v.entry_date,
      time: v.entry_time,
      readings: v.values.map(val => ({
        name: val.config.vital_name,
        value: val.vital_value,
        unit: val.config.unit
      }))
    }));

    return res.json({
      appointment,
      prescriptions,
      vitals: formattedVitals
    });
  } catch (err) {
    console.error('Error fetching appointment details:', err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Cancel Appointment
exports.cancelPatientAppointment = async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Ensure it's not already checked in or completed
    if (appointment.arrival_time || appointment.status === 2) {
      return res.status(400).json({ error: 'Cannot cancel an active or completed appointment.' });
    }

    // Status 4 = Cancelled (Adjust based on your DB ENUM)
    await appointment.update({ status: 2 }); 

    return res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling appointment:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getConditions = async (req, res) => {
  try {
    // 1. Get the authenticated user's Global Patient ID
    const global_patient_id = req.user.id; 

    // 2. Find all ClinicPatient profiles for this user
    const patientProfiles = await ClinicPatient.findAll({
      where: { global_patient_id: global_patient_id },
      attributes: ['id']
    });

    if (!patientProfiles || patientProfiles.length === 0) {
      return res.json({ diagnoses: [], allergies: [] }); 
    }

    const clinicPatientIds = patientProfiles.map(p => p.id);

    // 3. Fetch Appointments to act as our Timeline
    const appointments = await Appointment.findAll({
      where: { clinic_patient_id: { [Op.in]: clinicPatientIds } },
      attributes: ['id', 'datetime_start'],
    });

    if (appointments.length === 0) {
      return res.json({ diagnoses: [], allergies: [] });
    }

    // Map appointment IDs and create a quick lookup for their dates
    const appointmentIds = appointments.map(a => a.id);
    const appointmentDates = {};
    appointments.forEach(a => {
      appointmentDates[a.id] = a.datetime_start;
    });

    // 4. Fetch Diagnoses directly (Bypassing the Association Error)
    const diagnoses = await AppointmentDiagnosis.findAll({
      where: { appointment_id: { [Op.in]: appointmentIds } }
    });

    // Sort diagnoses latest to earliest based on appointment date
    diagnoses.sort((a, b) => new Date(appointmentDates[b.appointment_id]) - new Date(appointmentDates[a.appointment_id]));

    // 5. Deduplicate Diagnoses
    const uniqueDiagnoses = [];
    const seenDiagnosisIds = new Set();
    const seenDiagnosisNames = new Set();

    diagnoses.forEach(diag => {
      const isDuplicate = diag.diagnosis_catalog_id 
          ? seenDiagnosisIds.has(diag.diagnosis_catalog_id)
          : seenDiagnosisNames.has(diag.diagnosis_name.toLowerCase());

      if (!isDuplicate) {
        if (diag.diagnosis_catalog_id) seenDiagnosisIds.add(diag.diagnosis_catalog_id);
        seenDiagnosisNames.add(diag.diagnosis_name.toLowerCase());

        uniqueDiagnoses.push({
          id: diag.id,
          name: diag.diagnosis_name,
          date_diagnosed: appointmentDates[diag.appointment_id],
          status: diag.status || 'Active'
        });
      }
    });

    // 6. Fetch Allergies
    const allergies = await PatientAllergy.findAll({
      where: { clinic_patient_id: { [Op.in]: clinicPatientIds } },
      order: [['created_at', 'DESC']]
    });

    res.json({
      diagnoses: uniqueDiagnoses,
      allergies: allergies
    });
  } catch (err) {
    console.error('Error fetching conditions:', err);
    res.status(500).json({ error: err.message });
  }
};