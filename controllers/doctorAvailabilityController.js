const { DoctorAvailability, AvailabilityException, ClinicAdmin, ClinicDoctor, Clinic } = require('../models');
const { generateSlots, removeSlotsByDate, generateSlotsFor3Months } = require('../utils/slotUtils');
// FIX: Updated for date-fns-tz v3.x - function names changed
const { fromZonedTime: zonedTimeToUtc, format } = require('date-fns-tz');

// The authorization function is updated to use 'clinicDoctorId'
const isAuthorizedForAvailability = async (userId, clinicDoctorId, clinicId) => {
  console.log(`[AUTH] Checking authorization for user ${userId}, clinic doctor ${clinicDoctorId}, clinic ${clinicId}`);
  
  // Check if user is clinic admin for this clinic
  const isAdmin = await ClinicAdmin.findOne({ 
    where: { user_id: userId, clinic_id: clinicId } 
  });
  if (isAdmin) {
    console.log(`[AUTH] User ${userId} is admin for clinic ${clinicId}`);
    return { role: 'admin', authorized: true };
  }
  
  // Check if user is the doctor themselves, using the ClinicDoctor ID
  const doctor = await ClinicDoctor.findOne({
    where: { id: clinicDoctorId, global_doctor_id: userId, active: true }
  });
  if (doctor) {
    console.log(`[AUTH] User ${userId} is clinic doctor ${clinicDoctorId}`);
    return { role: 'doctor', authorized: true };
  }
  
  console.log(`[AUTH] User ${userId} is not authorized for clinic doctor ${clinicDoctorId} in clinic ${clinicId}`);
  return { role: null, authorized: false };
};

exports.addAvailability = async (req, res) => {
  const { clinic_doctor_id, clinic_id, weekday, start_time, end_time } = req.body;
  
  console.log(`[addAvailability] Received request to add availability for clinic doctor ${clinic_doctor_id} in clinic ${clinic_id}.`);
  console.log(`[addAvailability] Data: weekday=${weekday}, start_time=${start_time}, end_time=${end_time}`);

  try {
    const auth = await isAuthorizedForAvailability(req.user.id, clinic_doctor_id, clinic_id);
    if (!auth.authorized) {
      console.error(`[addAvailability] Unauthorized attempt by user ${req.user.id}.`);
      return res.status(403).json({ error: 'Unauthorized - must be clinic admin or the doctor' });
    }
    
    // Verify doctor belongs to clinic using the ClinicDoctor ID
    const doctor = await ClinicDoctor.findOne({
      where: { id: clinic_doctor_id, clinic_id: clinic_id, active: true }
    });
    if (!doctor) {
      console.error(`[addAvailability] Clinic Doctor ${clinic_doctor_id} not found in clinic ${clinic_id}.`);
      return res.status(400).json({ error: 'Doctor not found in this clinic' });
    }
    
    console.log('[addAvailability] Creating DoctorAvailability record...');
    const record = await DoctorAvailability.create({ 
      clinic_doctor_id, // Updated to use clinic_doctor_id
      clinic_id, 
      weekday, 
      start_time, 
      end_time 
    });
    console.log('[addAvailability] DoctorAvailability record created successfully:', record.id);
    
    console.log('[addAvailability] Generating slots for 3 months...');
    await generateSlotsFor3Months({ clinic_doctor_id, clinic_id, weekday, start_time, end_time });
    console.log('[addAvailability] Slots generated successfully.');

    res.status(201).json(record);
  } catch (err) {
    console.error('[addAvailability] An unexpected error occurred:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateAvailability = async (req, res) => {
  const { id } = req.params;
  // Updated to use clinic_doctor_id
  const { clinic_doctor_id, clinic_id, ...updates } = req.body;
  try {
    const auth = await isAuthorizedForAvailability(req.user.id, clinic_doctor_id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Updated where clause to use clinic_doctor_id
    await DoctorAvailability.update(updates, { where: { id, clinic_id, clinic_doctor_id } });
    await generateSlotsFor3Months({ ...updates, clinic_doctor_id, clinic_id });
    res.json({ message: 'Availability updated and slots regenerated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailability = async (req, res) => {
  // Updated to use clinic_doctor_id in query parameters
  const { clinic_doctor_id, clinic_id } = req.query;
  try {
    if (clinic_id) {
      const auth = await isAuthorizedForAvailability(req.user.id, clinic_doctor_id, clinic_id);
      if (!auth.authorized) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      // Updated where clause to use clinic_doctor_id
      const records = await DoctorAvailability.findAll({ 
        where: { clinic_doctor_id, clinic_id, active: true } 
      });
      return res.json(records);
    } else {
      // If no clinic_id, doctor can see all their availabilities across clinics
      const doctor = await ClinicDoctor.findOne({
        // The id from the query parameter corresponds to the ClinicDoctor id
        where: { id: clinic_doctor_id, global_doctor_id: req.user.id, active: true }
      });
      if (!doctor) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      // Updated where clause to use clinic_doctor_id
      const records = await DoctorAvailability.findAll({ 
        where: { clinic_doctor_id, active: true } 
      });
      return res.json(records);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAvailability = async (req, res) => {
  const { id } = req.params;
  // Updated to use clinic_doctor_id
  const { clinic_doctor_id, clinic_id } = req.query;
  try {
    const auth = await isAuthorizedForAvailability(req.user.id, clinic_doctor_id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Updated where clause to use clinic_doctor_id
    await DoctorAvailability.update({ active: false }, { where: { id, clinic_id, clinic_doctor_id } });
    res.json({ message: 'Availability deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addException = async (req, res) => {
  const { clinic_doctor_id, clinic_id, date, start_time, end_time, is_available, note } = req.body;
  
  try {
    const auth = await isAuthorizedForAvailability(req.user.id, clinic_doctor_id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // 1. Fetch the clinic to get its timezone
    const clinic = await Clinic.findByPk(clinic_id);
    if (!clinic || !clinic.timezone) {
      return res.status(400).json({ error: 'Clinic timezone has not been configured.' });
    }
    const clinicTimeZone = clinic.timezone;

    // 2. Combine the local date/time strings from user input
    const localDateTimeStart = `${date}T${start_time}`;

    // 3. Convert that clinic-local time to a true UTC Date object
    const utcStart = zonedTimeToUtc(localDateTimeStart, clinicTimeZone);

    // 4. Get the UTC date part for storage in the DATEONLY column
    const utcDateString = format(utcStart, 'yyyy-MM-dd', { timeZone: 'UTC' });
    
    // Note: start_time and end_time are saved directly as they are timezone-naive.
    // The key is storing them on the correct UTC *date*.
    const [exception, created] = await AvailabilityException.findOrCreate({
      where: { clinic_doctor_id, clinic_id, date: utcDateString, start_time },
      defaults: {
        end_time: end_time,
        is_available: is_available !== undefined ? is_available : false,
        note: note || ''
      }
    });

    if (!created) {
      await exception.update({ end_time, is_available, note });
    }
        
    res.status(201).json({ message: 'Exception recorded successfully.' });
  } catch (err) {
    console.error('[addException] An unexpected error occurred:', err);
    res.status(500).json({ error: err.message });
  }
};

// TIMEZONE FIX: Rewritten to send raw UTC data, letting the frontend handle display
exports.getExceptions = async (req, res) => {
  const { clinic_doctor_id, clinic_id } = req.query;
  try {
    const auth = await isAuthorizedForAvailability(req.user.id, clinic_doctor_id, clinic_id);
    if (!auth.authorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const exceptions = await AvailabilityException.findAll({ 
      where: { clinic_doctor_id, clinic_id },
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    // TIMEZONE FIX: Send the raw data from the database.
    // The database stores the UTC-equivalent date and time.
    // The frontend should be responsible for converting this to the user's local time for display if needed.
    // The previous logic was converting it to the SERVER's local time, which is incorrect.
    res.json(exceptions);
  } catch (err) {
    console.error('[getExceptions] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteException = async (req, res) => {
  const { id } = req.params;
  const { clinic_doctor_id, clinic_id, date, start_time, end_time } = req.query;
  
  console.log(`[deleteException] Received request to delete exception ${id}`);
  console.log(`[deleteException] Query params:`, { clinic_doctor_id, clinic_id, date, start_time, end_time });
  
  try {
    if (!clinic_doctor_id || !clinic_id) {
      console.error('[deleteException] Missing required query parameters');
      return res.status(400).json({ 
        error: 'Missing required parameters: clinic_doctor_id and clinic_id' 
      });
    }

    const auth = await isAuthorizedForAvailability(req.user.id, clinic_doctor_id, clinic_id);
    if (!auth.authorized) {
      console.error(`[deleteException] Unauthorized attempt by user ${req.user.id}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const exception = await AvailabilityException.findOne({ 
      where: { 
        id: parseInt(id), 
        clinic_id: parseInt(clinic_id), 
        clinic_doctor_id: parseInt(clinic_doctor_id) 
      } 
    });
    
    if (!exception) {
      console.error(`[deleteException] Exception ${id} not found`);
      return res.status(404).json({ error: 'Exception not found' });
    }
    
    console.log(`[deleteException] Found exception:`, exception.toJSON());
    
    const deletedCount = await AvailabilityException.destroy({ 
      where: { 
        id: parseInt(id), 
        clinic_id: parseInt(clinic_id), 
        clinic_doctor_id: parseInt(clinic_doctor_id) 
      } 
    });
    
    if (deletedCount === 0) {
      console.error(`[deleteException] No exception was deleted`);
      return res.status(404).json({ error: 'Exception not found or already deleted' });
    }
    
    const exceptionDate = date || exception.date;
    const exceptionStartTime = start_time || exception.start_time;
    const exceptionEndTime = end_time || exception.end_time;
    
    console.log(`[deleteException] Regenerating slots for ${exceptionDate} ${exceptionStartTime}-${exceptionEndTime}`);
    
    try {
      await generateSlots({ 
        clinic_doctor_id: parseInt(clinic_doctor_id), 
        clinic_id: parseInt(clinic_id), 
        date: exceptionDate, 
        start_time: exceptionStartTime, 
        end_time: exceptionEndTime 
      });
      console.log(`[deleteException] Slots regenerated successfully`);
    } catch (slotError) {
      console.warn(`[deleteException] Failed to regenerate slots:`, slotError);
    }
    
    console.log(`[deleteException] Exception ${id} removed successfully`);
    res.json({ message: 'Exception removed and slots regenerated.' });
  } catch (err) {
    console.error('[deleteException] Unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
};