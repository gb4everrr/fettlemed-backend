const { Prescription, Appointment, ClinicDoctor, DrugCatalog, User, DoctorProfile } = require('../models');
const { Op } = require('sequelize');

// --- PERMISSION HELPER (Standardized) ---
const isAssignedDoctor = async (userId, appointmentId) => {
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [{ model: ClinicDoctor, as: 'doctor' }]
  });
  if (!appointment || !appointment.doctor) return false;

  const user = await User.findByPk(userId, { include: [{ model: DoctorProfile, as: 'doctorProfile' }] });
  
  // Bridge User -> Global Doctor -> Clinic Doctor
  const assignedGlobalId = appointment.doctor.global_doctor_id;
  const userProfileId = user?.doctorProfile?.id;

  return (assignedGlobalId === userProfileId) || (assignedGlobalId === userId);
};

exports.getPrescriptions = async (req, res) => {
  const { appointment_id } = req.params;
  try {
    const meds = await Prescription.findAll({
      where: { appointment_id },
      order: [['created_at', 'ASC']]
    });

    const canEdit = (await isAssignedDoctor(req.user.id, appointment_id)) || req.user.role === 'owner';

    res.json({
      meds,
      permissions: { can_edit: canEdit }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addPrescription = async (req, res) => {
  const { appointment_id, drug_name, dose, frequency, duration, instructions, drug_catalog_id } = req.body;
  const userId = req.user.id;

  try {
    // 1. Permission Check
    const canEdit = (await isAssignedDoctor(userId, appointment_id)) || req.user.role === 'owner';
    if (!canEdit) return res.status(403).json({ error: "Unauthorized" });

    // 2. Fetch Appointment Context
    const appointment = await Appointment.findByPk(appointment_id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    // 3. Create Prescription with RENAMED fields
    const med = await Prescription.create({
      appointment_id,
      
      // DIRECT MAPPING: Appointment has these exact fields
      clinic_patient_id: appointment.clinic_patient_id, 
      clinic_doctor_id: appointment.clinic_doctor_id,   
      
      drug_catalog_id,
      drug_name,
      dose,
      frequency,
      duration,
      instructions
    });

    res.status(201).json(med);
  } catch (err) {
    console.error("Add Prescription Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deletePrescription = async (req, res) => {
    // ... (Keep existing delete logic, it's safe)
    try {
        const med = await Prescription.findByPk(req.params.id);
        if(!med) return res.status(404).json({error: "Not found"});
        
        const canEdit = (await isAssignedDoctor(req.user.id, med.appointment_id)) || req.user.role === 'owner';
        if (!canEdit) return res.status(403).json({ error: "Unauthorized" });

        await med.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ... (Keep searchDrugs as is)
exports.searchDrugs = async (req, res) => {
    // ... existing fuzzy search logic ...
    const { query } = req.query;
    if(!query || query.length < 2) return res.json([]);
    const results = await DrugCatalog.findAll({
        where: {
            is_active: true,
            [Op.or]: [
                { name: { [Op.iLike]: `%${query}%` } },
                { generic_name: { [Op.iLike]: `%${query}%` } },
                { search_aliases: { [Op.iLike]: `%${query}%` } }
            ]
        },
        limit: 20
    });
    res.json(results);
};