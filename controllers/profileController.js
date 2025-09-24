const { sequelize, DoctorProfile, PatientProfile, ClinicAdmin, Clinic, User } = require('../models');

exports.createDoctorProfile = async (req, res) => {
  const { user_id, medical_reg_no, specialization } = req.body;

  try {
    const profile = await DoctorProfile.create({ user_id, medical_reg_no, specialization });
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPatientProfile = async (req, res) => {
  const { user_id, address, emergency_contact } = req.body;

  try {
    const profile = await PatientProfile.create({ user_id, address, emergency_contact });
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createClinicAdmin = async (req, res) => {
  const { user_id, clinic_id } = req.body;

  try {
    const admin = await ClinicAdmin.create({ user_id, clinic_id });
    res.status(201).json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get the combined profile for the currently authenticated doctor
exports.getDoctorProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, {
            attributes: ['first_name', 'last_name', 'email', 'phone_number']
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const doctorProfile = await DoctorProfile.findOne({
            where: { user_id: userId }
        });

        // Combine data from User and DoctorProfile models
        const profileData = {
            ...user.toJSON(),
            medical_reg_no: doctorProfile ? doctorProfile.medical_reg_no : '',
            specialization: doctorProfile ? doctorProfile.specialization : ''
        };

        res.json(profileData);
    } catch (err) {
        console.error('Error fetching doctor profile:', err);
        res.status(500).json({ error: 'Failed to fetch profile data.' });
    }
};

// Create or update the DOCTOR-SPECIFIC profile info for the currently authenticated user
exports.updateDoctorProfile = async (req, res) => {
    const userId = req.user.id;
    // Only accept professional details from the request body
    const { medical_reg_no, specialization } = req.body;

    try {
        // Use a transaction for data integrity, even for a single operation
        await sequelize.transaction(async (t) => {
            // ONLY create or update the DoctorProfile model. Do not touch the User model.
            await DoctorProfile.upsert({
                user_id: userId,
                medical_reg_no,
                specialization
            }, { transaction: t });
        });

        // Fetch the complete user record to construct the response for Redux
        const updatedUser = await User.findByPk(userId);
        const updatedProfile = await DoctorProfile.findOne({ where: { user_id: userId } });

        // Construct the user object to match the structure in the Redux auth state
        const responseUserObject = {
            id: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role,
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            phoneNumber: updatedUser.phone_number,
            profileSetupComplete: !!(updatedProfile && updatedProfile.medical_reg_no && updatedProfile.specialization)
        };
        
        res.json({ message: 'Profile updated successfully', user: responseUserObject });

    } catch (err) {
        console.error("Error updating doctor profile:", err);
        res.status(500).json({ error: 'Failed to update profile. Please try again.' });
    }
};