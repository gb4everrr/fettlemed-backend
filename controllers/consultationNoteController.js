const { 
  ConsultationNote, 
  ConsultationNoteHistory, 
  Appointment, 
  ClinicDoctor, 
  User, 
  DoctorProfile 
} = require('../models');
const { Op } = require('sequelize');

// --- HELPER: Strict Doctor Check ---
const isAssignedDoctor = async (userId, appointmentId) => {
  try {
    console.log(`\n--- DEBUGGING PERMISSIONS (User: ${userId}, Appt: ${appointmentId}) ---`);

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [{ model: ClinicDoctor, as: 'doctor' }]
    });

    if (!appointment) { console.log("❌ Appointment not found"); return false; }
    if (!appointment.doctor) { console.log("❌ Appointment has no doctor assigned"); return false; }

    const user = await User.findByPk(userId, {
      include: [{ model: DoctorProfile, as: 'doctorProfile' }]
    });

    if (!user) { console.log("❌ User not found in DB"); return false; }

    const apptClinicDoctorId = appointment.doctor.id;
    const apptGlobalDoctorId = appointment.doctor.global_doctor_id;
    const userProfileId = user.doctorProfile ? user.doctorProfile.id : 'NULL';

    console.log(`👉 Appointment assigned to ClinicDoctor ID: ${apptClinicDoctorId}`);
    console.log(`👉 Appointment expects Global Doctor ID:   ${apptGlobalDoctorId}`);
    console.log(`👉 Logged-in User ID:                      ${user.id}`);
    console.log(`👉 Logged-in User's DoctorProfile ID:      ${userProfileId}`);

    if (user.doctorProfile && apptGlobalDoctorId === user.doctorProfile.id) {
      console.log("✅ MATCH: Global ID matches User Profile ID");
      return true;
    }
    if (apptGlobalDoctorId === user.id) {
      console.log("✅ MATCH: Global ID matches User ID directly");
      return true;
    }

    console.log("❌ NO MATCH FOUND. Permission Denied.");
    console.log("------------------------------------------------------------\n");
    return false;

  } catch (err) {
    console.error("❌ ERROR in isAssignedDoctor:", err);
    return false;
  }
};

// --- CONTROLLER FUNCTIONS ---

exports.addNote = async (req, res) => {
  const { 
    appointment_id, 
    subjective, 
    objective, 
    provisional_diagnosis,  // NEW
    observations_private, 
    clinic_id 
  } = req.body;

  const userId   = req.user.id;
  const userRole = req.user.role;

  try {
    const appointment = await Appointment.findByPk(appointment_id, {
      include: [{ model: ClinicDoctor, as: 'doctor' }]
    });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const isAssigned = await isAssignedDoctor(userId, appointment_id);
    const isOwner    = userRole === 'owner';

    if (!isAssigned && !isOwner) {
      return res.status(403).json({ 
        error: 'Strict Access: Only the assigned doctor can update clinical notes.' 
      });
    }

    // UPSERT
    let [note, created] = await ConsultationNote.findOrCreate({
      where: { appointment_id },
      defaults: {
        appointment_id,
        clinic_id,
        clinic_patient_id:    appointment.clinic_patient_id,
        clinic_doctor_id:     appointment.clinic_doctor_id,
        subjective,
        objective,
        provisional_diagnosis,  // NEW
        observations_private,
        updated_at: new Date()
      }
    });

    if (!created) {
      // Snapshot existing values into history before overwriting
      await ConsultationNoteHistory.create({
        consultation_note_id:  note.id,
        updated_by_id:         appointment.clinic_doctor_id,
        subjective:            note.subjective,
        objective:             note.objective,
        provisional_diagnosis: note.provisional_diagnosis,  // NEW
        observations_private:  note.observations_private,
        change_reason:         'Update'
      });

      // Write new values
      note.subjective            = subjective;
      note.objective             = objective;
      note.provisional_diagnosis = provisional_diagnosis;  // NEW
      note.observations_private  = observations_private;
      note.updated_at            = new Date();
      await note.save();
    }

    const data = note.toJSON();

    res.status(200).json({
      ...data,
      created_at: data.created_at ? new Date(data.created_at).toISOString() : null,
      updated_at: data.updated_at ? new Date(data.updated_at).toISOString() : null,
    });

  } catch (err) {
    console.error("Save Note Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getNotesByAppointment = async (req, res) => {
  const { appointment_id } = req.params;
  const userId   = req.user.id;
  const userRole = req.user.role;

  try {
    const note = await ConsultationNote.findOne({ where: { appointment_id } });

    const isAssigned = await isAssignedDoctor(userId, appointment_id);
    const isOwner    = userRole === 'owner';
    const canEdit    = isAssigned || isOwner;

    let responseData = note
      ? note.toJSON()
      : { 
          subjective:            '', 
          objective:             '', 
          provisional_diagnosis: '',  // NEW — always include in empty state
          observations_private:  '' 
        };

    responseData.permissions = {
      can_edit:         canEdit,
      can_view_private: canEdit
    };

    // Strip private data for non-editors
    if (!canEdit) {
      delete responseData.observations_private;
    }

    res.json(responseData);

  } catch (err) {
    console.error("Get Note Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPreviousNotes = async (req, res) => {
  try {
    const clinic_id               = parseInt(req.query.clinic_id);
    const patient_id              = parseInt(req.query.patient_id);
    const doctor_id               = parseInt(req.query.doctor_id);
    const current_appointment_id  = parseInt(req.query.current_appointment_id);

    console.log(`🔎 Fetching History for Clinic: ${clinic_id}, Patient: ${patient_id}, Doctor: ${doctor_id}`);

    const notes = await ConsultationNote.findAll({
      where: {
        appointment_id: { [Op.ne]: current_appointment_id }
      },
      include: [{
        model: Appointment,
        as: 'appointment',
        required: true,
        where: {
          clinic_id,
          clinic_patient_id: patient_id,
          clinic_doctor_id:  doctor_id
        },
        attributes: ['datetime_start', 'id']
      }],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    console.log(`✅ Found ${notes.length} previous notes mapping to this context.`);
    res.json(notes);

  } catch (err) {
    console.error("Previous Notes Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getNoteHistory = async (req, res) => {
  const { note_id } = req.params;
  try {
    const history = await ConsultationNoteHistory.findAll({
      where: { consultation_note_id: note_id },
      include: [{
        model: ClinicDoctor,
        as: 'editor',
        attributes: ['first_name', 'last_name']
      }],
      order: [['created_at', 'DESC']]
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};