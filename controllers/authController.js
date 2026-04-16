const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Ensure Clinic and ClinicAdmin models are imported
const { User, ClinicPatient, ClinicDoctor, Clinic, ClinicAdmin, DoctorProfile,PatientProfile, PatientSelfData } = require('../models'); 
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
  const { password, role, first_name, last_name, phone_number } = req.body;
  const email = req.body.email.toLowerCase().trim();
  
  const t = await sequelize.transaction();

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await t.rollback();
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    // 1. Create the Base User
    const user = await User.create({
      email,
      password_hash,
      role,
      first_name,
      last_name,
      phone_number
    }, { transaction: t });

    // Use this variable to store the ID for the final response
    let createdPatientProfileId = null;

    // 2. Role-Specific Logic
    if (user.role === 'patient') {
      // --- NEW FIX: Create Global PatientProfile ---
      const profile = await PatientProfile.create({
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        gender: 'Other',
        dob: null
      }, { transaction: t });

      createdPatientProfileId = profile.id;

      // --- EXISTING LOGIC: Link Clinic Records ---
      await ClinicPatient.update(
        { global_patient_id: user.id },
        { where: { global_patient_id: null, phone_number: user.phone_number }, transaction: t }
      );
    } 
    else if (user.role === 'doctor') {
      // --- DOCTOR LOGIC: Preserved exactly as in your original file ---
      const ghostProfiles = await ClinicDoctor.findAll({
        where: { global_doctor_id: null, phone_number: user.phone_number },
        transaction: t
      });

      if (ghostProfiles.length > 0) {
        await ClinicDoctor.update(
          { global_doctor_id: user.id },
          { where: { global_doctor_id: null, phone_number: user.phone_number }, transaction: t }
        );

        const permissionPromises = ghostProfiles.map(profile => {
          const finalRole = profile.assigned_role || 'DOCTOR';
          return ClinicAdmin.findOrCreate({
            where: { user_id: user.id, clinic_id: profile.clinic_id },
            defaults: { role: finalRole, active: true },
            transaction: t
          });
        });
        await Promise.all(permissionPromises);
      }
      
      // Also create their professional profile
      await DoctorProfile.create({
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number
      }, { transaction: t });
    }

    await t.commit();

    // 3. Generate Token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 4. Consistent JSON Response
    // We add patient_profile_id without breaking the original structure
    res.status(201).json({ 
      token, 
      user: { 
        ...user.toJSON(),
        patient_profile_id: createdPatientProfileId 
      } 
    });

  } catch (err) {
    if (t) await t.rollback();
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
};


exports.login = async (req, res) => {
  const { password } = req.body;
  const email = req.body.email.toLowerCase().trim();

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    let clinics = [];
    let profileSetupComplete = false;
    let patientProfileId = null;

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
      const patientProfile = await PatientProfile.findOne({ where: { user_id: user.id } });
      
      if (patientProfile) {
        patientProfileId = patientProfile.id;
        
        // Fetch the Lifestyle data from PatientSelfData
        const selfData = await PatientSelfData.findOne({
          where: { 
            patient_profile_id: patientProfile.id, 
            data_type: 'medical_history' 
          }
        });

        // DEFINITION: Complete = Has DOB (Step 1) AND Has Lifestyle JSON (Step 3)
        // We don't care if they skipped Step 2 (Conditions/Allergies)
        const hasBasics = !!patientProfile.date_of_birth;
        const hasLifestyle = !!(selfData && selfData.data && selfData.data.lifestyle);

        profileSetupComplete = hasBasics && hasLifestyle;
      }
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
        patient_profile_id: patientProfileId,
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