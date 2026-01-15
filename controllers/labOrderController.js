const { LabOrder, LabCatalog, Appointment, ClinicDoctor, User, DoctorProfile } = require('../models');
const { Op } = require('sequelize');

// --- PERMISSION HELPER ---
// Reuse the helper logic from your ConsultationNoteController
const isAssignedDoctor = async (userId, appointmentId) => {
  const { Appointment, ClinicDoctor, User, DoctorProfile } = require('../models');
  
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [{ model: ClinicDoctor, as: 'doctor' }]
  });
  if (!appointment || !appointment.doctor) return false;

  const user = await User.findByPk(userId, {
    include: [{ model: DoctorProfile, as: 'doctorProfile' }]
  });
  
  const assignedGlobalId = appointment.doctor.global_doctor_id;
  const userProfileId = user?.doctorProfile?.id;

  return (assignedGlobalId === userProfileId) || (assignedGlobalId === userId);
};

exports.getAppointmentOrders = async (req, res) => {
  const { appointment_id } = req.params;
  const userId = req.user.id;

  try {
    const orders = await LabOrder.findAll({
      where: { appointment_id },
      include: [
        { model: LabCatalog, as: 'catalog_item' },
        { model: ClinicDoctor, as: 'doctor', attributes: ['first_name', 'last_name'] }
      ]
    });

    // Reuse your working isAssignedDoctor helper
    const canEdit = (await isAssignedDoctor(userId, appointment_id)) || req.user.role === 'owner';

    // RETURN THE SAME STRUCTURE AS SOAP
    res.json({
      orders: orders || [],
      permissions: {
        can_edit: canEdit
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 1. SEARCH CATALOG (Fuzzy Search)
exports.searchCatalog = async (req, res) => {
  const { query } = req.query;
  try {
    const results = await LabCatalog.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { test_name: { [Op.iLike]: `%${query}%` } },
          { test_code: { [Op.iLike]: `%${query}%` } },
          { search_aliases: { [Op.iLike]: `%${query}%` } }
        ]
      },
      limit: 15
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. CREATE ORDER
exports.createOrder = async (req, res) => {
  const { appointment_id, lab_catalog_id, priority, notes } = req.body;
  const userId = req.user.id;

  try {
    const canOrder = (await isAssignedDoctor(userId, appointment_id)) || req.user.role === 'owner';
    
    if (!canOrder) {
      return res.status(403).json({ error: "Unauthorized: Only the assigned doctor can place orders." });
    }

    // Proceed with creation...
    const appointment = await Appointment.findByPk(appointment_id);
    const catalogItem = await LabCatalog.findByPk(lab_catalog_id);

    const order = await LabOrder.create({
      clinic_id: appointment.clinic_id,
      clinic_patient_id: appointment.clinic_patient_id,
      appointment_id: appointment.id,
      ordered_by_doctor_id: appointment.clinic_doctor_id,
      lab_catalog_id: catalogItem.id,
      test_name: catalogItem.test_name,
      priority: priority || 'routine',
      notes: notes,
      status: 'Ordered'
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

