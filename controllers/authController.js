const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Ensure Clinic and ClinicAdmin models are imported
const { User, ClinicPatient, ClinicDoctor, Clinic, ClinicAdmin, DoctorProfile } = require('../models'); 
const { sequelize } = require('../models'); 

const ROLES = require('../config/roles');

const getPermissionsForRole = (roleName) => {
  const role = ROLES[roleName];
  if (!role) return [];

  let perms = [...role.permissions];
  // If role inherits permissions from others (e.g. Owner -> Admin)
  if (role.inherits) {
    role.inherits.forEach(parent => {
      perms = [...perms, ...getPermissionsForRole(parent)];
    });
  }
  return [...new Set(perms)]; // Return unique list
};

exports.register = async (req, res) => {
  const { email, password, role, first_name, last_name, phone_number } = req.body;
  
  // Start transaction to ensure linking is atomic
  const t = await sequelize.transaction();

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await t.rollback();
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    // 1. Create the User
    const user = await User.create({
      email,
      password_hash,
      role,
      first_name,
      last_name,
      phone_number
    }, { transaction: t });

    // 2. Link Existing Profiles & Grant Permissions
    if (user.role === 'patient') {
      await ClinicPatient.update(
        { global_patient_id: user.id },
        { where: { global_patient_id: null, phone_number: user.phone_number }, transaction: t }
      );
    } 
    else if (user.role === 'doctor') {
      // A. Find all "Ghost" profiles for this phone number
      const ghostProfiles = await ClinicDoctor.findAll({
        where: { global_doctor_id: null, phone_number: user.phone_number },
        transaction: t
      });

      if (ghostProfiles.length > 0) {
        // B. Link the Clinical Profiles
        await ClinicDoctor.update(
          { global_doctor_id: user.id },
          { where: { global_doctor_id: null, phone_number: user.phone_number }, transaction: t }
        );

        // C. CREATE PERMISSIONS (The Critical Fix)
        // For every clinic where this doctor was a "Ghost", create a ClinicAdmin record
        // so they can now log in and see that clinic.
        const permissionPromises = ghostProfiles.map(profile => {
          const finalRole = profile.assigned_role || 'DOCTOR';
          return ClinicAdmin.findOrCreate({
            where: { user_id: user.id, clinic_id: profile.clinic_id },
            defaults: {
              role: finalRole,
              active: true
            },
            transaction: t
          });
        });
        
        await Promise.all(permissionPromises);
      }
    }

    await t.commit();

    // Generate Token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({ token, user: { id: user.id, ...user.toJSON() } });

  } catch (err) {
    await t.rollback();
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    let clinics = [];
    let profileSetupComplete = false;

    if (user.role === 'clinic_admin') {
      // Fetch all clinics associated with the admin
      const adminRecords = await ClinicAdmin.findAll({
    where: { user_id: user.id },
    include: [{ model: Clinic, as: 'clinic' }]
  });

  clinics = adminRecords.map(record => {
    const staffRole = record.role; // This is the new 'role' column from DB
    return {
      ...record.clinic.toJSON(),
      role: staffRole,
      permissions: getPermissionsForRole(staffRole) // Send this to frontend
    };
  });
      profileSetupComplete = clinics.length > 0;
    } else if (user.role === 'doctor') {
      // ADDED: Logic to check if the doctor's profile is complete.
      const doctorProfile = await DoctorProfile.findOne({ where: { user_id: user.id } });
      // The profile is considered complete if the core professional details are filled.
      profileSetupComplete = !!(doctorProfile && doctorProfile.medical_reg_no && doctorProfile.specialization);
    } else if (user.role === 'patient') {
      // ... (existing logic)
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Ensure the response object structure is consistent
    const userPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        profileSetupComplete: profileSetupComplete,
    };

    // Add clinics array only for roles that need it
    if (user.role === 'clinic_admin') {
        userPayload.clinics = clinics;
    }

    res.json({ token, user: userPayload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
};