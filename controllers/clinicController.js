const { Clinic, ClinicAdmin } = require('../models');

exports.createClinic = async (req, res) => {
  const { name, address, email, phone } = req.body;
  const user_id = req.user.id; // assuming JWT middleware sets req.user

  try {
    const clinic = await Clinic.create({ name, address, email, phone });

    await ClinicAdmin.create({
      user_id,
      clinic_id: clinic.id,
      role: 'Owner', // Assigning 'Owner' role upon clinic creation
      active: true
    });

    res.status(201).json({ message: 'Clinic created', clinic });
  } catch (err) {
    console.error('Error creating clinic:', err); // Log error for debugging
    res.status(500).json({ error: err.message || 'Internal server error during clinic creation.' });
  }
};

// NEW: Function to handle updating a clinic
exports.updateClinic = async (req, res) => {
  const { id } = req.params; // Clinic ID from URL parameter
  const { name, address, email, phone } = req.body; // Updatable fields
  const user_id = req.user.id; // User ID from authenticated JWT

  try {
    // First, verify that the logged-in user is an admin/owner of this clinic
    const clinicAdmin = await ClinicAdmin.findOne({
      where: {
        clinic_id: id,
        user_id: user_id,
        // Optional: add role: 'Owner' if only owners can update the primary clinic details
      }
    });

    if (!clinicAdmin) {
      return res.status(403).json({ message: 'Unauthorized: You do not have permission to update this clinic.' });
    }

    // Now, update the clinic
    const [updatedRowsCount] = await Clinic.update(
      { name, address, email, phone },
      { where: { id: id } }
    );

    if (updatedRowsCount === 0) {
      // This means clinic was not found or no fields were actually changed
      return res.status(404).json({ message: 'Clinic not found or no changes were applied.' });
    }

    const updatedClinic = await Clinic.findByPk(id); // Fetch the updated record
    res.status(200).json({ message: 'Clinic updated successfully', clinic: updatedClinic });

  } catch (err) {
    console.error('Error updating clinic:', err); // Log the error for debugging
    res.status(500).json({ error: err.message || 'Internal server error during clinic update.' });
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