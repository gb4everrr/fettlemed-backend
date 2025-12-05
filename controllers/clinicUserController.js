const { User, ClinicDoctor, ClinicPatient, ClinicAdmin } = require('../models');
const bcrypt = require('bcrypt');
const { sequelize } = require('../models'); 
const { Op } = require('sequelize');

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
  const clinic_id = parseInt(req.query.clinic_id);
  try {
    // 1. Get all clinical profiles
    const doctors = await ClinicDoctor.findAll({ where: { clinic_id } });
    
    // 2. Extract User IDs to fetch roles in bulk
    const userIds = doctors
      .map(d => d.global_doctor_id)
      .filter(id => id !== null);

    // 3. Fetch Roles from ClinicAdmin
    const adminRecords = await ClinicAdmin.findAll({
      where: { 
        clinic_id, 
        user_id: { [Op.in]: userIds } 
      },
      attributes: ['user_id', 'role']
    });

    // 4. Create a Map for O(1) lookup
    const roleMap = {};
    adminRecords.forEach(r => { roleMap[r.user_id] = r.role; });

    // 5. Merge Role into response
    const doctorsWithRoles = doctors.map(d => {
      const doc = d.toJSON();
      const isRegistered = !!d.global_doctor_id;
      // If no user ID, they are "Pending"
      doc.role = isRegistered 
        ? (roleMap[d.global_doctor_id] || d.assigned_role || 'DOCTOR') 
        : (d.assigned_role || 'DOCTOR');

      doc.registration_status = isRegistered ? 'REGISTERED' : 'PENDING';
      return doc;
    });

    res.json(doctorsWithRoles);
  } catch (err) {
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
  const { clinic_id, phone_number, first_name, last_name, email, address, emergency_contact, patient_code, clinic_notes } = req.body;

  try {
    

    const user = await User.findOne({ where: { phone_number } });

    const patient = await ClinicPatient.create({
      clinic_id,
      global_patient_id: user ? user.id : null,
      phone_number,
      first_name,
      last_name,
      email,
      address,
      emergency_contact,
      patient_code,
      clinic_notes
    });

    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicPatients = async (req, res) => {
  const clinic_id = parseInt(req.query.clinic_id);
  try {
   
    const patients = await ClinicPatient.findAll({ where: { clinic_id } });
    res.json(patients);
  } catch (err) {
    console.error('Error in getClinicPatients:', err);
    // Explicitly check for TypeError related to req.user
    if (err instanceof TypeError && err.message.includes("Cannot read properties of undefined")) {
        return res.status(403).json({ error: 'Authentication failed or token is invalid.' });
    }
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