const { User, ClinicDoctor, ClinicPatient, ClinicAdmin } = require('../models');

const isAuthorizedClinicAdmin = async (user_id, clinic_id) => {
  // Fixed: Only query columns that actually exist in the table
  const admin = await ClinicAdmin.findOne({ 
    where: { user_id, clinic_id } 
  });
  return !!admin;
};

exports.addClinicDoctor = async (req, res) => {
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  
  const { clinic_id, phone_number, first_name, last_name, email, address, specialization, medical_reg_no, started_date } = req.body;

  try {
    console.log('Checking authorization for user:', req.user.id, 'clinic:', clinic_id);
    
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    console.log('Looking for user with phone:', phone_number);
    const user = await User.findOne({ where: { phone_number } });
    console.log('Found user:', user?.id || 'none');

    console.log('Creating doctor with data:', {
      clinic_id,
      global_doctor_id: user ? user.id : null,
      phone_number,
      first_name,
      last_name,
      email,
      address,
      specialization,
      medical_reg_no,
      started_date
    });

    const doctor = await ClinicDoctor.create({
      clinic_id,
      global_doctor_id: user ? user.id : null,
      phone_number,
      first_name,
      last_name,
      email,
      address,
      specialization,
      medical_reg_no,
      started_date
    });

    console.log('Doctor created successfully:', doctor.id);
    res.status(201).json(doctor);
  } catch (err) {
    console.error('Error creating doctor:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicDoctors = async (req, res) => {
  const clinic_id = parseInt(req.query.clinic_id);
  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    const doctors = await ClinicDoctor.findAll({ where: { clinic_id } });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicDoctor = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.query.clinic_id);
  
  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    const doctor = await ClinicDoctor.findOne({ 
      where: { id, clinic_id } 
    });
    
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    res.json(doctor);
  } catch (err) {
    console.error('Error fetching doctor:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateClinicDoctor = async (req, res) => {
  const { id } = req.params;
  const clinic_id = parseInt(req.body.clinic_id);
  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
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
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    await ClinicDoctor.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Doctor removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addClinicPatient = async (req, res) => {
  const { clinic_id, phone_number, first_name, last_name, email, address, emergency_contact, patient_code, clinic_notes } = req.body;

  try {
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

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
    // Check if req.user exists and then perform authorization check
    if (!req.user || !await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
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
    if (!req.user || !await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

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
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
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
    if (!await isAuthorizedClinicAdmin(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    await ClinicPatient.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Patient removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};