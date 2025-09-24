// Complete doctorVitalAssignmentController.js file

const { DoctorVitalAssignment, ClinicVitalConfig, ClinicAdmin, ClinicDoctor } = require('../models');

const isClinicAdmin = async (userId, clinicId) => {
  const admin = await ClinicAdmin.findOne({ 
    where: { user_id: userId, clinic_id: clinicId} 
  });
  return !!admin;
};

// FIX: Parse clinic_id from req.body
exports.assignVitalsToDoctor = async (req, res) => {
  const { clinic_id, clinic_doctor_id, vital_assignments } = req.body;
  try {
    const clinicIdInt = parseInt(clinic_id, 10);
    if (isNaN(clinicIdInt)) {
        return res.status(400).json({ error: 'Invalid clinic_id provided' });
    }
    const clinicDoctorIdInt = parseInt(clinic_doctor_id, 10);
    if (isNaN(clinicDoctorIdInt)) {
        return res.status(400).json({ error: 'Invalid clinic_doctor_id provided' });
    }

    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Only clinic admins can assign vitals' });
    }

    // Remove existing assignments
    await DoctorVitalAssignment.destroy({ where: { clinic_doctor_id: clinicDoctorIdInt } });

    // Create new assignments
    const assignments = vital_assignments.map(assignment => ({
      clinic_doctor_id: clinicDoctorIdInt,
      vital_config_id: assignment.vital_config_id, // References existing clinic_vital_config
      is_required: assignment.is_required || false,
      sort_order: assignment.sort_order || 0
    }));

    await DoctorVitalAssignment.bulkCreate(assignments);
    res.status(201).json({ message: 'Vitals assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// FIX: Parse clinic_id and clinic_doctor_id to integers
exports.getAvailableVitalsForAssignment = async (req, res) => {
  const { clinic_id, clinic_doctor_id } = req.query;
  try {
    const clinicIdInt = parseInt(clinic_id, 10);
    if (isNaN(clinicIdInt)) {
        return res.status(400).json({ error: 'Invalid clinic_id provided' });
    }
    const clinicDoctorIdInt = parseInt(clinic_doctor_id, 10);
    if (isNaN(clinicDoctorIdInt)) {
        return res.status(400).json({ error: 'Invalid clinic_doctor_id provided' });
    }

    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const vitals = await ClinicVitalConfig.findAll({
      attributes: ['id', 'clinic_id', 'vital_name', 'data_type', 'unit', 'is_active', 'is_required'],
      where: { clinic_id: clinicIdInt, is_active: true },
      include: [
        {
          model: DoctorVitalAssignment,
          as: 'assignments',
          where: { clinic_doctor_id: clinicDoctorIdInt },
          required: false
        }
      ],
      order: [['vital_name', 'ASC']]
    });

    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// FIX: Parse clinic_id and clinic_doctor_id to integers
exports.getDoctorAssignedVitals = async (req, res) => {
  const { clinic_doctor_id } = req.params;
  const { clinic_id } = req.query;
  
  try {
    const clinicIdInt = parseInt(clinic_id, 10);
    if (isNaN(clinicIdInt)) {
        return res.status(400).json({ error: 'Invalid clinic_id provided' });
    }
    const clinicDoctorIdInt = parseInt(clinic_doctor_id, 10);
    if (isNaN(clinicDoctorIdInt)) {
        return res.status(400).json({ error: 'Invalid clinic_doctor_id provided' });
    }

    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const assignments = await DoctorVitalAssignment.findAll({
      where: { clinic_doctor_id: clinicDoctorIdInt },
      include: [
        {
          model: ClinicVitalConfig,
          as: 'vitalConfig',
          where: { is_active: true },
          attributes: ['id', 'clinic_id', 'vital_name', 'data_type', 'unit', 'is_active', 'is_required']
        }
      ],
      order: [['sort_order', 'ASC']]
    });

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// FIX: Refactor to use two separate, more reliable queries and merge results
exports.getLibraryWithDoctorAssignments = async (req, res) => {
  const { clinic_id, clinic_doctor_id } = req.query;
  
  try {
    const clinicIdInt = parseInt(clinic_id, 10);
    if (isNaN(clinicIdInt)) {
        return res.status(400).json({ error: 'Invalid clinic_id provided' });
    }

    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Step 1: Get all vitals from the clinic's library
    const vitalsLibrary = await ClinicVitalConfig.findAll({
      attributes: ['id', 'clinic_id', 'vital_name', 'data_type', 'unit', 'is_active', 'is_required'],
      where: { clinic_id: clinicIdInt, is_active: true },
      order: [['vital_name', 'ASC']]
    });

    // Step 2: Get all assignments for the specific doctor if one is provided
    let doctorAssignments = [];
    if (clinic_doctor_id) {
        const clinicDoctorIdInt = parseInt(clinic_doctor_id, 10);
        if (isNaN(clinicDoctorIdInt)) {
            return res.status(400).json({ error: 'Invalid clinic_doctor_id provided' });
        }
        doctorAssignments = await DoctorVitalAssignment.findAll({
            where: { clinic_doctor_id: clinicDoctorIdInt }
        });
    }

    // Step 3: Combine the data
    const combinedVitals = vitalsLibrary.map(vital => {
      const vitalPlain = vital.get({ plain: true });
      const assignment = doctorAssignments.find(a => a.vital_config_id === vital.id);
      if (assignment) {
        vitalPlain.assignments = [assignment.get({ plain: true })];
      } else {
        vitalPlain.assignments = [];
      }
      return vitalPlain;
    });

    res.json(combinedVitals);
  } catch (err) {
    console.error('Error fetching library with assignments:', err);
    res.status(500).json({ error: err.message });
  }
};
