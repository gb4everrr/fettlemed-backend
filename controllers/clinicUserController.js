const { User, ClinicDoctor, ClinicPatient, ClinicAdmin, DoctorAvailability, AvailabilityException, Clinic } = require('../models');
const bcrypt = require('bcrypt');
const { sequelize } = require('../models'); 
const { Op } = require('sequelize');
const { calculateTodayAvailability } = require('../utils/calculateTodayAvailability');

const getDoctorRole = async (userId, clinicId) => {
  if (!userId) return null; // Ghost profile has no role yet
  const admin = await ClinicAdmin.findOne({
    where: { user_id: userId, clinic_id: clinicId },
    attributes: ['role']
  });
  return admin ? admin.role : null;
};

exports.addStaffMember = async (req, res) => {
  const { 
    clinic_id, 
    email, 
    first_name, 
    last_name, 
    phone_number, 
    role, 
    password, // Only needed if user is new
    custom_permissions 
  } = req.body;

  const t = await sequelize.transaction();

  try {
    // 1. Check if user exists globally
    let user = await User.findOne({ where: { email } });
    let isNewUser = false;

    // 2. If User doesn't exist, Create them
    if (!user) {
      if (!password) {
        await t.rollback();
        return res.status(400).json({ error: "Password is required for new users." });
      }
      
      const password_hash = await bcrypt.hash(password, 10);
      
      user = await User.create({
        email,
        password_hash,
        first_name,
        last_name,
        phone_number,
        role: 'clinic_admin' // Global role (can be refined)
      }, { transaction: t });
      
      isNewUser = true;
    }

    // 3. Check if they are already in THIS clinic
    const existingStaff = await ClinicAdmin.findOne({
      where: { clinic_id, user_id: user.id }
    });

    if (existingStaff) {
      await t.rollback();
      return res.status(409).json({ error: "User is already a staff member in this clinic." });
    }

    // 4. Add them to ClinicAdmin
    const staffMember = await ClinicAdmin.create({
      user_id: user.id,
      clinic_id,
      role: role || 'CLINIC_ADMIN',
      custom_permissions: custom_permissions || [],
      active: true
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      message: isNewUser ? 'User created and added to staff.' : 'Existing user added to staff.',
      staff: staffMember
    });

  } catch (err) {
    await t.rollback();
    console.error('Add Staff Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// --- NEW: Get All Staff for a Clinic ---
exports.getClinicStaff = async (req, res) => {
  const { clinic_id } = req.query;
  
  try {
    const staff = await ClinicAdmin.findAll({
      where: { clinic_id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone_number']
      }]
    });
    
    // Flatten structure for frontend
    const formattedStaff = staff.map(s => ({
      id: s.id, // clinic_admin ID
      user_id: s.user.id,
      name: `${s.user.first_name} ${s.user.last_name}`,
      email: s.user.email,
      phone: s.user.phone_number,
      role: s.role,
      active: s.active,
      custom_permissions: s.custom_permissions
    }));

    res.json(formattedStaff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- NEW: Remove/Deactivate Staff ---
exports.removeStaffMember = async (req, res) => {
  const { clinic_id, user_id } = req.body; // or params, depending on your route preference

  try {
    // Soft delete by setting active = false
    // or destroy() if you want hard delete (not recommended for audit)
    await ClinicAdmin.update(
      { active: false },
      { where: { clinic_id, user_id } }
    );
    
    res.json({ message: "Staff member access revoked." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.addClinicDoctor = async (req, res) => {
  // Extract 'role' from body (defaults to DOCTOR_VISITING if not sent)
  const { clinic_id, phone_number, role, ...data } = req.body;
  const doctorRole = role || 'DOCTOR_VISITING'; 
  
  const t = await sequelize.transaction();

  try {
    const user = await User.findOne({ where: { phone_number } });
    
    // 1. Create Clinical Profile
    const doctor = await ClinicDoctor.create({
      clinic_id,
      global_doctor_id: user ? user.id : null,
      phone_number,
      assigned_role: doctorRole,
      ...data
    }, { transaction: t });

    // 2. Create Access Record with specific ROLE
    if (user) {
      const [accessRecord, created] = await ClinicAdmin.findOrCreate({
        where: { clinic_id, user_id: user.id },
        defaults: {
          role: doctorRole, 
          active: true
        },
        transaction: t
      });

      // If they existed but had a different role, update it
      if (!created && accessRecord.role !== doctorRole) {
          accessRecord.role = doctorRole;
          await accessRecord.save({ transaction: t });
      }
    }

    await t.commit();
    res.status(201).json(doctor);

  } catch (err) {
    await t.rollback();
    console.error('Add Doctor Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicDoctors = async (req, res) => {
  const { clinic_id } = req.query;

  try {
    // 1. Fetch Clinic Settings to get Timezone
    const clinic = await Clinic.findByPk(clinic_id);
    const timeZone = clinic?.timezone || 'Asia/Kolkata'; // Fallback to IST if missing

    // 2. Calculate "Today" in the CLINIC'S Timezone
    // We use Intl.DateTimeFormat to reliably convert UTC server time to Clinic Local Time
    const now = new Date();
    
    // Get Weekday (e.g., 'Saturday')
    const currentWeekday = new Intl.DateTimeFormat('en-US', { 
      timeZone, 
      weekday: 'long' 
    }).format(now);

    // Get Date (e.g., '2026-01-31')
    // en-CA format gives YYYY-MM-DD which matches SQL DATEONLY
    const currentDateStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone 
    }).format(now);

    console.log(`[getClinicDoctors] Clinic: ${clinic_id} | Timezone: ${timeZone}`);
    console.log(`[getClinicDoctors] System thinks it is: ${currentWeekday}, ${currentDateStr}`);

    // 3. Fetch Active Doctors
    const doctors = await ClinicDoctor.findAll({
      where: { clinic_id, active: true },
      attributes: ['id', 'first_name', 'last_name', 'specialization', 'active']
    });

    // 4. Fetch Schedule & Exceptions
    const scheduledToday = await DoctorAvailability.findAll({
      where: { clinic_id, weekday: currentWeekday, active: true }
    });

    const exceptionsToday = await AvailabilityException.findAll({
      where: { clinic_id, date: currentDateStr }
    });

    // 5. Merge Logic
    const doctorsWithStatus = doctors.map(doc => {
      const docJson = doc.toJSON();
      
      const exception = exceptionsToday.find(e => e.clinic_doctor_id === doc.id);
      
      if (exception) {
         // Exception rules (True = Extra Shift, False = Time Off)
         docJson.is_available_today = exception.is_available;
         docJson.debug_reason = "Exception Found";
      } else {
         // Standard Schedule
         const hasShift = scheduledToday.some(s => s.clinic_doctor_id === doc.id);
         docJson.is_available_today = hasShift;
         docJson.debug_reason = hasShift ? "Standard Shift" : "No Shift";
      }
      
      return docJson;
    });

    res.json(doctorsWithStatus);

  } catch (err) {
    console.error('Error fetching clinic doctors:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicDoctor = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.query.clinic_id);
  
  try {
    const doctor = await ClinicDoctor.findOne({ where: { id, clinic_id } });
    
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    
    const docData = doctor.toJSON();
    // Fetch Role
    docData.role = await getDoctorRole(doctor.global_doctor_id, clinic_id) || 'PENDING';
    
    res.json(docData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateClinicDoctor = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.body.clinic_id);
  try {
    await ClinicDoctor.update(req.body, { where: { id, clinic_id } });
    const updated = await ClinicDoctor.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteClinicDoctor = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.query.clinic_id);
  try {
    await ClinicDoctor.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Doctor removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addClinicPatient = async (req, res) => {
  const { 
    clinic_id, first_name, last_name, email, 
    phone_number, address, 
    gender, // <--- Now backed by DB
    dob     // <--- Now backed by DB
  } = req.body;

  try {
    if (!first_name || !last_name || !phone_number) {
      return res.status(400).json({ error: 'First name, last name, and phone are required.' });
    }

    const newPatient = await ClinicPatient.create({
      clinic_id,
      first_name,
      last_name,
      email: email || null,
      phone_number,
      address: address || null,
      gender: gender || 'Male',
      dob: dob || null,
      registered_at: new Date()
    });

    res.status(201).json(newPatient);
  } catch (err) {
    console.error('Error adding clinic patient:', err);
    res.status(500).json({ error: err.message });
  }
};


exports.getClinicPatients = async (req, res) => {
  try {
    // 1. robustly get clinic_id (from query OR user session)
    const clinic_id = req.query.clinic_id || req.user.clinic_id; 
    const { query } = req.query;

    const whereClause = { clinic_id };

    // 2. ONLY apply search filter if 'query' is provided
    if (query && query.trim() !== '') {
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${query}%` } },
        { last_name: { [Op.iLike]: `%${query}%` } },
        { phone_number: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } } 
      ];
    }

    const patients = await ClinicPatient.findAll({
      where: whereClause,
      order: [['first_name', 'ASC']],
      limit: 50 // Safety limit to prevent crashing UI if list is huge
    });

    res.json(patients);
  } catch (err) {
    console.error('Error fetching clinic patients:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicPatient = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.query.clinic_id);

  try {
    

    const patient = await ClinicPatient.findOne({
      where: { id, clinic_id },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (err) {
    console.error('Error in getClinicPatient:', err);
    if (err instanceof TypeError && err.message.includes('Cannot read properties of undefined')) {
      return res.status(403).json({ error: 'Authentication failed or token is invalid.' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.updateClinicPatient = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.body.clinic_id);
  try {
    
    await ClinicPatient.update(req.body, { where: { id, clinic_id } });
    const updated = await ClinicPatient.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteClinicPatient = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.query.clinic_id);
  try {
    
    await ClinicPatient.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Patient removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add ROLES for validation
const ROLES = require('../config/roles');

exports.updateStaffPermissions = async (req, res) => {
  const { clinic_id, user_id, role, custom_permissions } = req.body;

  try {
    // 1. Validation: Ensure the role exists in your config
    if (role && !ROLES[role]) {
      return res.status(400).json({ error: `Invalid role: ${role}` });
    }

    // 2. Validation: Ensure custom_permissions are valid strings
    if (custom_permissions) {
      const allValidPerms = new Set(Object.values(ROLES).flatMap(r => r.permissions));
      const invalid = custom_permissions.filter(p => !allValidPerms.has(p));
      
      if (invalid.length > 0) {
        return res.status(400).json({ 
          error: `Invalid permissions: ${invalid.join(', ')}` 
        });
      }
    }

    // 3. Find the Staff Member (ClinicAdmin record)
    const staffMember = await ClinicAdmin.findOne({
      where: { clinic_id, user_id }
    });

    if (!staffMember) {
      return res.status(404).json({ error: 'Staff member not found in this clinic.' });
    }

    // 4. Update fields
    if (role) staffMember.role = role;
    if (custom_permissions) staffMember.custom_permissions = custom_permissions;
    
    // Toggle Active Status if provided
    if (req.body.active !== undefined) {
      staffMember.active = req.body.active;
    }

    await staffMember.save();

    res.json({ 
      message: 'Permissions updated successfully', 
      staff: {
        user_id: staffMember.user_id,
        role: staffMember.role,
        custom_permissions: staffMember.custom_permissions,
        active: staffMember.active
      }
    });

  } catch (err) {
    console.error('Error updating permissions:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getDoctorsAvailableNow = async (req, res) => {
    const { clinic_id } = req.query;
    
    try {
        if (!clinic_id) {
            return res.status(400).json({ error: 'clinic_id is required' });
        }

        // 1. Get clinic to access timezone
        const clinic = await Clinic.findByPk(clinic_id);
        if (!clinic) {
            return res.status(404).json({ error: 'Clinic not found' });
        }
        const clinicTimezone = clinic.timezone || 'Asia/Kolkata';

        // 2. Get current time in clinic timezone
        const now = new Date();
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: clinicTimezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        const currentTimeString = timeFormatter.format(now); // "14:30"
        const [currentHour, currentMinute] = currentTimeString.split(':').map(Number);
        const currentTotalMinutes = (currentHour * 60) + currentMinute;

        // 3. Fetch all active doctors
        const doctors = await ClinicDoctor.findAll({
            where: { 
                clinic_id: clinic_id, 
                active: true 
            },
            // Include any associations you need (e.g., user info)
        });

        // 4. Calculate today's availability for each doctor
        const doctorsWithAvailability = await Promise.all(
            doctors.map(async (doctor) => {
                const doctorData = doctor.toJSON();
                
                // Calculate today's availability
                const todayAvailability = await calculateTodayAvailability(
                    doctor.id, 
                    clinic_id, 
                    clinicTimezone
                );
                
                return {
                    ...doctorData,
                    is_available_today: todayAvailability.is_available_today,
                    start_time: todayAvailability.start_time,
                    end_time: todayAvailability.end_time
                };
            })
        );

        // 5. Filter to only doctors available RIGHT NOW
        const availableNow = doctorsWithAvailability.filter(doctor => {
            // Must be available today
            if (!doctor.is_available_today) return false;
            
            // Must have shift times
            if (!doctor.start_time || !doctor.end_time) return false;
            
            // Parse shift times
            const [startHour, startMinute] = doctor.start_time.split(':').map(Number);
            const [endHour, endMinute] = doctor.end_time.split(':').map(Number);
            
            const startTotalMinutes = (startHour * 60) + startMinute;
            const endTotalMinutes = (endHour * 60) + endMinute;
            
            // Allow 30-minute early check-in buffer
            const bufferMinutes = 30;
            const effectiveStart = startTotalMinutes - bufferMinutes;
            
            // Check if current time is within the window
            return currentTotalMinutes >= effectiveStart && currentTotalMinutes <= endTotalMinutes;
        });

        res.json(availableNow);
        
    } catch (error) {
        console.error('[getDoctorsAvailableNow] Error:', error);
        res.status(500).json({ error: error.message });
    }
};