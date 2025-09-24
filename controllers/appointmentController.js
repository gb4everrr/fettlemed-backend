const { Appointment, AppointmentSlot, ClinicAdmin, ClinicDoctor, DoctorAvailability, AvailabilityException, ClinicPatient, Clinic } = require('../models');
const { Op } = require('sequelize');
const { parse } = require('date-fns');
// FIX: Updated imports for date-fns-tz v3.x
// FIX: Updated for date-fns-tz v3.x - function names changed
const { fromZonedTime: zonedTimeToUtc, toZonedTime: utcToZonedTime, format } = require('date-fns-tz');

// Authorization function for clinic access
const isAuthorizedForClinic = async (userId, clinicId) => {
  const isAdmin = await ClinicAdmin.findOne({ 
    where: { user_id: userId, clinic_id: clinicId } 
  });
  if (isAdmin) {
    return { role: 'admin', authorized: true };
  }
  return { role: null, authorized: false };
};

// UPDATED: Enhanced authorization to support both clinic admins and doctors
const isAuthorizedForDoctor = async (userId, clinicDoctorId, clinicId = null) => {
  const doctor = await ClinicDoctor.findByPk(clinicDoctorId);
  if (doctor && doctor.global_doctor_id === userId) {
    return { role: 'doctor', authorized: true, doctorId: doctor.id };
  }
  
  if (clinicId) {
    const isAdmin = await ClinicAdmin.findOne({ where: { user_id: userId, clinic_id: clinicId } });
    if (isAdmin) return { role: 'admin', authorized: true };
  }
  
  return { role: null, authorized: false };
};

exports.getAvailableSlotsForAdmin = async (req, res) => {
  const { clinic_id, clinic_doctor_id, date } = req.query;
  
  if (!clinic_id || !clinic_doctor_id || !date) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const auth = await isAuthorizedForClinic(req.user.id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized clinic view' });
    }

    const clinic = await Clinic.findByPk(clinic_id);
    if (!clinic || !clinic.timezone) {
      return res.status(400).json({ error: 'Clinic timezone has not been configured.' });
    }
    const clinicTimeZone = clinic.timezone;

    // FIX: Improved date parsing and timezone handling
    console.log('Processing date:', date, 'for timezone:', clinicTimeZone);
    
    // Parse the date more reliably
    const targetDate = new Date(`${date}T00:00:00`);
    console.log('Parsed target date:', targetDate);
    
    // Get weekday name more reliably
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdayNames[targetDate.getDay()];
    console.log('Calculated weekday:', weekday);

    // FIX: More robust timezone conversion
    let startOfDayInClinicTime, endOfDayInClinicTime;
    
    try {
      startOfDayInClinicTime = zonedTimeToUtc(`${date}T00:00:00`, clinicTimeZone);
      endOfDayInClinicTime = zonedTimeToUtc(`${date}T23:59:59.999`, clinicTimeZone);
      console.log('Timezone conversion successful:', {
        start: startOfDayInClinicTime,
        end: endOfDayInClinicTime
      });
    } catch (timezoneError) {
      console.error('Timezone conversion error:', timezoneError);
      // Fallback to basic date handling if timezone conversion fails
      startOfDayInClinicTime = new Date(`${date}T00:00:00Z`);
      endOfDayInClinicTime = new Date(`${date}T23:59:59.999Z`);
    }

    const generalAvailability = await DoctorAvailability.findAll({ 
      where: { clinic_doctor_id, clinic_id, weekday, active: true } 
    });
    console.log('Found general availability:', generalAvailability.length);

    const exceptions = await AvailabilityException.findAll({ 
      where: { clinic_doctor_id, clinic_id, date } 
    });
    console.log('Found exceptions:', exceptions.length);

    const bookedSlots = await AppointmentSlot.findAll({
      where: {
        clinic_doctor_id,
        clinic_id,
        booked: true,
        start_time: { [Op.between]: [startOfDayInClinicTime, endOfDayInClinicTime] }
      }
    });
    console.log('Found booked slots:', bookedSlots.length);
    
    let potentialSlots = [];
    
    // Process general availability
    generalAvailability.forEach(avail => {
      try {
        const availStartUtc = zonedTimeToUtc(`${date}T${avail.start_time}`, clinicTimeZone);
        const availEndUtc = zonedTimeToUtc(`${date}T${avail.end_time}`, clinicTimeZone);
        
        let currentSlotStart = availStartUtc;
        while (currentSlotStart.getTime() < availEndUtc.getTime()) {
          potentialSlots.push(currentSlotStart);
          currentSlotStart = new Date(currentSlotStart.getTime() + 60 * 60 * 1000);
        }
      } catch (err) {
        console.error('Error processing availability slot:', err);
      }
    });
    
    console.log('Generated potential slots from availability:', potentialSlots.length);

    // Process exceptions
    exceptions.forEach(ex => {
      try {
        // FIX: Handle exception timezone conversion more carefully
        const exStartUtc = zonedTimeToUtc(`${ex.date}T${ex.start_time}`, clinicTimeZone);
        const exEndUtc = zonedTimeToUtc(`${ex.date}T${ex.end_time}`, clinicTimeZone);
        
        if (ex.is_available) {
          // Add exception slots
          let currentSlotStart = exStartUtc;
          while (currentSlotStart.getTime() < exEndUtc.getTime()) {
            if (!potentialSlots.some(s => s.getTime() === currentSlotStart.getTime())) {
              potentialSlots.push(currentSlotStart);
            }
            currentSlotStart = new Date(currentSlotStart.getTime() + 60 * 60 * 1000);
          }
        } else {
          // Remove exception slots
          potentialSlots = potentialSlots.filter(slot => {
            const slotEnd = new Date(slot.getTime() + 60 * 60 * 1000);
            return slotEnd.getTime() <= exStartUtc.getTime() || slot.getTime() >= exEndUtc.getTime();
          });
        }
      } catch (err) {
        console.error('Error processing exception:', err);
      }
    });

    // Filter out booked slots
    const finalSlotsUtc = potentialSlots.filter(slot => {
      return !bookedSlots.some(booked => new Date(booked.start_time).getTime() === slot.getTime());
    });
    
    console.log('Final available slots:', finalSlotsUtc.length);
    
    // FIX: Improved slot formatting with better error handling
    const finalSlots = finalSlotsUtc
      .sort((a, b) => a.getTime() - b.getTime())
      .map(utcSlot => {
        try {
          // Convert back to clinic timezone for display
          const zonedSlotStart = utcToZonedTime(utcSlot, clinicTimeZone);
          const zonedSlotEnd = utcToZonedTime(new Date(utcSlot.getTime() + 60 * 60 * 1000), clinicTimeZone);
          
          return {
            id: utcSlot.getTime(), // Use timestamp as unique ID
            start_time: format(zonedSlotStart, 'HH:mm'),
            end_time: format(zonedSlotEnd, 'HH:mm'),
            // Include UTC times for easier frontend handling
            start_time_utc: utcSlot.toISOString(),
            end_time_utc: new Date(utcSlot.getTime() + 60 * 60 * 1000).toISOString(),
          };
        } catch (err) {
          console.error('Error formatting slot:', err);
          // Fallback formatting
          const startHour = utcSlot.getUTCHours();
          const endHour = (startHour + 1) % 24;
          return {
            id: utcSlot.getTime(),
            start_time: `${String(startHour).padStart(2, '0')}:00`,
            end_time: `${String(endHour).padStart(2, '0')}:00`,
            start_time_utc: utcSlot.toISOString(),
            end_time_utc: new Date(utcSlot.getTime() + 60 * 60 * 1000).toISOString(),
          };
        }
      });

    res.json(finalSlots);

  } catch (err) {
    console.error('Error fetching available slots:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch available slots: ' + err.message });
  }
};

// UPDATED: Create appointment with proper timezone handling
exports.createAppointment = async (req, res) => {
  // Accept both datetime formats: either clinic timezone or UTC
  const { clinic_doctor_id, clinic_id, clinic_patient_id, datetime_start, datetime_end, notes, timezone } = req.body;
  
  try {
    const auth = await isAuthorizedForClinic(req.user.id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const doctor = await ClinicDoctor.findOne({
      where: { id: clinic_doctor_id, clinic_id: clinic_id, active: true }
    });
    if (!doctor) {
      return res.status(400).json({ error: 'Doctor not found in this clinic' });
    }

    // Verify the clinic_patient exists
    const clinicPatient = await ClinicPatient.findOne({
      where: { 
        id: clinic_patient_id,
        clinic_id: clinic_id
      }
    });
    
    if (!clinicPatient) {
      return res.status(400).json({ error: 'Patient not found in this clinic' });
    }

    // Get clinic timezone for conversion if needed
    const clinic = await Clinic.findByPk(clinic_id);
    const clinicTimeZone = clinic?.timezone || 'Asia/Kolkata';

    // Convert datetime to UTC if it's in clinic timezone
    let startUtc, endUtc;
    
    try {
      if (timezone && timezone !== 'UTC') {
        // Frontend sent timezone-aware datetime, convert to UTC
        startUtc = zonedTimeToUtc(datetime_start, timezone);
        endUtc = zonedTimeToUtc(datetime_end, timezone);
      } else if (datetime_start.includes('Z') || datetime_start.includes('+')) {
        // Already in UTC or has timezone info
        startUtc = new Date(datetime_start);
        endUtc = new Date(datetime_end);
      } else {
        // Assume it's in clinic timezone and convert to UTC
        startUtc = zonedTimeToUtc(datetime_start, clinicTimeZone);
        endUtc = zonedTimeToUtc(datetime_end, clinicTimeZone);
      }
    } catch (timezoneError) {
      console.error('Timezone conversion error in createAppointment:', timezoneError);
      // Fallback to direct parsing
      startUtc = new Date(datetime_start);
      endUtc = new Date(datetime_end);
    }

    console.log('Datetime conversion:', {
      original_start: datetime_start,
      original_end: datetime_end,
      converted_start_utc: startUtc.toISOString(),
      converted_end_utc: endUtc.toISOString(),
      clinic_timezone: clinicTimeZone
    });

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      where: {
        clinic_doctor_id,
        clinic_id,
        [Op.or]: [
          {
            datetime_start: {
              [Op.between]: [startUtc, endUtc]
            }
          },
          {
            datetime_end: {
              [Op.between]: [startUtc, endUtc]
            }
          },
          {
            [Op.and]: [
              { datetime_start: { [Op.lte]: startUtc } },
              { datetime_end: { [Op.gte]: endUtc } }
            ]
          }
        ],
        status: { [Op.ne]: 2 } // Not cancelled
      }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ error: 'Time slot is already booked' });
    }

    // Create the slot with UTC times
    const slot = await AppointmentSlot.create({
      clinic_id,
      clinic_doctor_id,
      start_time: startUtc,
      end_time: endUtc,
      booked: true
    });
    
    // Create the appointment with UTC times
    const appointment = await Appointment.create({ 
      clinic_doctor_id, 
      clinic_id, 
      clinic_patient_id: clinic_patient_id,
      slot_id: slot.id,
      datetime_start: startUtc,
      datetime_end: endUtc,
      notes: notes || null
    });
    
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateAppointment = async (req, res) => {
  const { id } = req.params;
  const { clinic_id, notes, status } = req.body;
  try {
    const auth = await isAuthorizedForClinic(req.user.id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    
    await Appointment.update(updateData, { where: { id, clinic_id } });
    const updated = await Appointment.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rescheduleAppointmentForAdmin = async (req, res) => {
  const { id } = req.params;
  const { clinic_id, new_slot_id } = req.body;
  
  try {
    const auth = await isAuthorizedForClinic(req.user.id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized to reschedule this appointment.' });
    }

    const appointment = await Appointment.findByPk(id);
    if (!appointment || appointment.clinic_id !== parseInt(clinic_id)) {
      return res.status(404).json({ error: 'Appointment not found or does not belong to this clinic.' });
    }

    const newSlot = await AppointmentSlot.findByPk(new_slot_id);
    if (!newSlot || newSlot.booked || newSlot.clinic_id !== parseInt(clinic_id)) {
      return res.status(400).json({ error: 'Invalid or unavailable new slot.' });
    }

    const oldSlot = await AppointmentSlot.findByPk(appointment.slot_id);
    if (oldSlot) {
      await oldSlot.update({ booked: false });
    }

    await newSlot.update({ booked: true });

    await appointment.update({
      slot_id: new_slot_id,
      datetime_start: newSlot.start_time,
      datetime_end: newSlot.end_time,
      status: 0
    });

    const updatedAppointment = await Appointment.findByPk(id);
    res.json({ message: 'Appointment rescheduled successfully', updatedAppointment });

  } catch (err) {
    console.error('Error rescheduling appointment:', err);
    res.status(500).json({ error: 'Failed to reschedule appointment.' });
  }
};

exports.cancelAppointment = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.query;
  try {
    const auth = await isAuthorizedForClinic(req.user.id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await appointment.update({ status: 2 });
    await AppointmentSlot.update({ booked: false }, { where: { id: appointment.slot_id } });

    res.json({ message: 'Appointment cancelled and slot freed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleConfirmation = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.query;
  try {
    const auth = await isAuthorizedForClinic(req.user.id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const newStatus = appointment.status === 1 ? 0 : 1;
    await appointment.update({ status: newStatus });
    res.json({ message: `Appointment ${newStatus === 1 ? 'confirmed' : 'set to pending'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATED: Get appointments with proper UTC handling
exports.getAppointments = async (req, res) => {
  const { clinic_id, clinic_doctor_id, patient_profile_id, startDate, endDate } = req.query;
  
  try {
    if (!clinic_id) {
        return res.status(400).json({ error: 'Clinic ID is required.' });
    }
    
    const auth = await isAuthorizedForClinic(req.user.id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized clinic view' });
    }
    
    // Build where clause for filtering
    const whereClause = { clinic_id };
    
    if (clinic_doctor_id) {
      whereClause.clinic_doctor_id = clinic_doctor_id;
    }
    
    if (patient_profile_id) {
      whereClause.clinic_patient_id = patient_profile_id;
    }
    
    // Date range filtering (convert to UTC for database query)
    if (startDate || endDate) {
      const clinic = await Clinic.findByPk(clinic_id);
      const clinicTimeZone = clinic?.timezone || 'Asia/Kolkata';
      
      const dateFilter = {};
      
      try {
        if (startDate) {
          // Convert start of day in clinic timezone to UTC
          const startOfDayUtc = zonedTimeToUtc(`${startDate}T00:00:00`, clinicTimeZone);
          dateFilter[Op.gte] = startOfDayUtc;
        }
        
        if (endDate) {
          // Convert end of day in clinic timezone to UTC
          const endOfDayUtc = zonedTimeToUtc(`${endDate}T23:59:59.999`, clinicTimeZone);
          dateFilter[Op.lte] = endOfDayUtc;
        }
      } catch (timezoneError) {
        console.error('Timezone conversion error in getAppointments:', timezoneError);
        // Fallback date filtering
        if (startDate) {
          dateFilter[Op.gte] = new Date(`${startDate}T00:00:00Z`);
        }
        if (endDate) {
          dateFilter[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
        }
      }
      
      whereClause.datetime_start = dateFilter;
    }
    
    // Fetch appointments with associations
    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        { 
          model: ClinicDoctor, 
          as: 'doctor',
          attributes: ['id', 'first_name', 'last_name']
        },
        { 
          model: ClinicPatient, 
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['datetime_start', 'ASC']]
    });

    // Format appointments with proper UTC ISO strings
    const formattedAppointments = appointments.map(appt => {
      const plainAppt = appt.toJSON();
      
      // Ensure datetime fields are properly formatted as UTC ISO strings
      const datetime_start = new Date(plainAppt.datetime_start);
      const datetime_end = new Date(plainAppt.datetime_end);
      
      return {
        ...plainAppt,
        // Provide both the original datetime and formatted string versions
        datetime_start_str: datetime_start.toISOString(),
        datetime_end_str: datetime_end.toISOString(),
        // Keep original for backward compatibility if needed
        datetime_start: datetime_start.toISOString(),
        datetime_end: datetime_end.toISOString(),
      };
    });

    return res.json(formattedAppointments);
    
  } catch (err) {
    console.error('Error in getAppointments:', err);
    res.status(500).json({ error: err.message });
  }
};