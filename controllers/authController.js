const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Ensure Clinic and ClinicAdmin models are imported
const { User, ClinicPatient, ClinicDoctor, Clinic, ClinicAdmin, DoctorProfile } = require('../models'); 

exports.register = async (req, res) => {
  const { email, password, role, first_name, last_name, phone_number } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password_hash,
      role,
      first_name,
      last_name,
      phone_number
    });

    if (user.role === 'patient') {
      await ClinicPatient.update(
        { global_patient_id: user.id },
        { where: { global_patient_id: null, phone_number: user.phone_number } }
      );
    } else if (user.role === 'doctor') {
      await ClinicDoctor.update(
        { doctor_profile_id: user.id },
        { where: { doctor_profile_id: null, phone_number: user.phone_number } }
      );
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name, phoneNumber: user.phone_number } });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.name === 'SequelizeDatabaseError' && err.parent && err.parent.code === '42703') {
        return res.status(500).json({ message: `Database error: Column not found. Please check your database schema for roles: ${req.body.role}. Error details: ${err.parent.message}` });
    }
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
};

// UPDATED: Login function to return clinics and profile setup status
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
      clinics = await Clinic.findAll({
        include: {
          model: ClinicAdmin,
          as: 'clinicAdmins',
          where: { user_id: user.id },
          attributes: []
        }
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