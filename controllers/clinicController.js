const { Clinic, ClinicAdmin } = require('../models');

exports.createClinic = async (req, res) => {
  const { name, address, email, phone } = req.body;
  const user_id = req.user.id; // assuming JWT middleware sets req.user

  try {
    const clinic = await Clinic.create({ name, address, email, phone });

    await ClinicAdmin.create({
      user_id,
      clinic_id: clinic.id,
      role: 'OWNER', // Assigning 'Owner' role upon clinic creation
      active: true
    });

    res.status(201).json({ message: 'Clinic created', clinic });
  } catch (err) {
    console.error('Error creating clinic:', err); // Log error for debugging
    res.status(500).json({ error: err.message || 'Internal server error during clinic creation.' });
  }
};

exports.createBranch = async (req, res) => {
  const { clinic_id } = req.params;
  const { name, address, email, phone } = req.body;
  const user_id = req.user.id;

  try {
    // 1. Create the new clinic linked to the parent
    const branch = await Clinic.create({
      name,
      address,
      email,
      phone,
      parent_clinic_id: clinic_id
    });

    // 2. IMPORTANT: Give the Owner access to this new branch immediately
    // so it appears in their "Switch Clinic" dropdown.
    await ClinicAdmin.create({
      user_id,
      clinic_id: branch.id,
      role: 'OWNER', 
      active: true
    });

    res.status(201).json({ message: 'Branch created successfully', branch });
  } catch (err) {
    console.error('Error creating branch:', err);
    res.status(500).json({ error: err.message });
  }
};

// --- NEW: Get Branches for a specific Parent ---
exports.getClinicBranches = async (req, res) => {
  const { clinic_id } = req.params; // Parent Clinic ID
  try {
    const branches = await Clinic.findAll({
      where: { parent_clinic_id: clinic_id }
    });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NEW: Function to handle updating a clinic
exports.updateClinic = async (req, res) => {
  const { id } = req.params; // Clinic ID from URL parameter
  const { name, address, email, phone,brandColor } = req.body; // Updatable fields

  try {
    const [updatedRowsCount] = await Clinic.update(
      { name, address, email, phone, brandColor },
      { where: { id: id } }
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({ message: 'Clinic not found or no changes were applied.' });
    }

    const updatedClinic = await Clinic.findByPk(id);
    res.status(200).json({ message: 'Clinic updated successfully', clinic: updatedClinic });

  } catch (err) {
    console.error('Error updating clinic:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getClinicDetails = async (req, res) => {
  const { id } = req.params; 
  const user_id = req.user.id;

  try {
    
    const clinic = await Clinic.findByPk(id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    
    res.json(clinic);
    
  } catch (err) {
    console.error('Error in getClinicDetails:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllClinics = async (req, res) => {
  try {
    const clinics = await Clinic.findAll();
    res.json(clinics);
  } catch (err) {
    console.error('Error getting all clinics:', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
};

exports.getMyClinics = async (req, res) => {
  const user_id = req.user.id;

  try {
    const clinics = await Clinic.findAll({
      include: {
        model: ClinicAdmin,
        as: 'clinicAdmins', // <--- CRUCIAL: Added the alias here
        where: { user_id },
        attributes: [] // Don't return ClinicAdmin attributes in the main query result
      }
    });

    // If no clinics are found for this admin, explicitly return 404
    if (clinics.length === 0) {
      return res.status(404).json({ message: "No clinics found for this admin." });
    }
    res.json(clinics);
  } catch (err) {
    console.error('Error getting my clinics:', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
};