const { AppointmentDiagnosis, DiagnosisCatalog, Appointment, ClinicDoctor, User, DoctorProfile, ConsultationNote } = require('../models');
const { Op } = require('sequelize');

// --- PERMISSION HELPER ---
const isAssignedDoctor = async (userId, appointmentId) => {
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [{ model: ClinicDoctor, as: 'doctor' }]
  });
  if (!appointment || !appointment.doctor) return false;
  const user = await User.findByPk(userId, { include: [{ model: DoctorProfile, as: 'doctorProfile' }] });
  const assignedGlobalId = appointment.doctor.global_doctor_id;
  const userProfileId = user?.doctorProfile?.id;
  return (assignedGlobalId === userProfileId) || (assignedGlobalId === userId);
};

// 1. SEARCH CATALOG
exports.searchCatalog = async (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) return res.json([]);

  try {
    const results = await DiagnosisCatalog.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { snomed_code: { [Op.iLike]: `%${query}%` } },
          { icd_code: { [Op.iLike]: `%${query}%` } },
          { search_aliases: { [Op.iLike]: `%${query}%` } }
        ]
      },
      limit: 20
    });
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. GET DIAGNOSES + COMMENTS
exports.getDiagnoses = async (req, res) => {
  const { appointment_id } = req.params;
  try {
    const list = await AppointmentDiagnosis.findAll({
      where: { appointment_id },
      order: [['created_at', 'ASC']]
    });
    
    // Fetch comments from the note
    const note = await ConsultationNote.findOne({ where: { appointment_id } });

    const canEdit = (await isAssignedDoctor(req.user.id, appointment_id)) || req.user.role === 'owner';

    res.json({
      list,
      comments: note ? note.diagnosis_comments : '',
      permissions: { can_edit: canEdit }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. ADD DIAGNOSIS
exports.addDiagnosis = async (req, res) => {
  const { appointment_id, diagnosis_catalog_id, description, code, type } = req.body;
  const userId = req.user.id;

  try {
    const canEdit = (await isAssignedDoctor(userId, appointment_id)) || req.user.role === 'owner';
    if (!canEdit) return res.status(403).json({ error: "Unauthorized" });

    const appt = await Appointment.findByPk(appointment_id);
    
    // Audit who added it
    const user = await User.findByPk(userId);
    const adderName = user.first_name + " " + user.last_name;

    const item = await AppointmentDiagnosis.create({
      appointment_id,
      clinic_patient_id: appt.clinic_patient_id,
      clinic_doctor_id: appt.clinic_doctor_id,
      diagnosis_catalog_id,
      description,
      code,
      type: type || 'Provisional',
      added_by_user_id: userId,
      added_by_name: adderName
    });

    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. REMOVE DIAGNOSIS
exports.removeDiagnosis = async (req, res) => {
  const { id } = req.params;
  try {
    const item = await AppointmentDiagnosis.findByPk(id);
    if (!item) return res.status(404).json({ error: "Not found" });

    const canEdit = (await isAssignedDoctor(req.user.id, item.appointment_id)) || req.user.role === 'owner';
    if (!canEdit) return res.status(403).json({ error: "Unauthorized" });

    await item.destroy();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. SAVE COMMENTS (Card 2)
exports.saveComments = async (req, res) => {
  const { appointment_id, comments } = req.body;
  try {
    const canEdit = (await isAssignedDoctor(req.user.id, appointment_id)) || req.user.role === 'owner';
    if (!canEdit) return res.status(403).json({ error: "Unauthorized" });

    let note = await ConsultationNote.findOne({ where: { appointment_id } });
    
    // Create note if it doesn't exist yet (e.g. if SOAP tab wasn't opened)
    if (!note) {
        const appt = await Appointment.findByPk(appointment_id);
        note = await ConsultationNote.create({
            appointment_id,
            patient_profile_id: appt.clinic_patient_id, // using column for consistency
            doctor_profile_id: appt.clinic_doctor_id
        });
    }

    note.diagnosis_comments = comments;
    await note.save();

    res.json({ success: true, comments: note.diagnosis_comments });
  } catch (err) { res.status(500).json({ error: err.message }); }
};