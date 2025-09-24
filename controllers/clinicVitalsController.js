// src/controllers/clinicVitalsController.js

const { ClinicVitalConfig, VitalsEntry, VitalsRecordedValue, ClinicAdmin, ClinicDoctor } = require('../models');

// ADD THIS HELPER FUNCTION IF IT'S MISSING
const isClinicAdmin = async (userId, clinicId) => {
  try {
    const admin = await ClinicAdmin.findOne({ 
      where: { user_id: userId, clinic_id: clinicId } 
    });
    return !!admin;
  } catch (error) {
    console.error('Error checking clinic admin:', error);
    return false;
  }
};

// RENAMED: createVitalConfig → createVitalLibraryItem
exports.createVitalLibraryItem = async (req, res) => {
  const { clinic_id } = req.body;
  try {
    console.log('Creating vital library item:', req.body); // DEBUG LOG

    const clinicIdInt = parseInt(clinic_id);
    if (isNaN(clinicIdInt)) {
      return res.status(400).json({ error: 'Invalid clinic_id' });
    }
    
    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Only clinic admins can manage vital library' });
    }
    
    // FIX: Use 'returning' to explicitly specify the columns to return after creation.
    const vitalConfig = await ClinicVitalConfig.create(req.body, { 
      returning: ['id', 'clinic_id', 'vital_name', 'data_type', 'unit', 'is_active', 'is_required']
    });
    res.status(201).json(vitalConfig);
  } catch (err) {
    console.error('Error creating vital:', err); // DEBUG LOG
    res.status(500).json({ error: err.message });
  }
};

// RENAMED: updateVitalConfig → updateVitalLibraryItem
exports.updateVitalLibraryItem = async (req, res) => {
  const { id } = req.params;
  const { clinic_id, ...updateFields } = req.body;
  try {
    console.log('Updating vital library item:', id, updateFields); // DEBUG LOG
    
    const clinicIdInt = parseInt(clinic_id);
    if (isNaN(clinicIdInt)) {
      return res.status(400).json({ error: 'Invalid clinic_id' });
    }

    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Only clinic admins can manage vital library' });
    }
    
    await ClinicVitalConfig.update(updateFields, { where: { id, clinic_id: clinicIdInt } });
    
    // FIX: Add 'attributes' to findByPk to explicitly specify columns.
    const updated = await ClinicVitalConfig.findByPk(id, { 
      attributes: ['id', 'clinic_id', 'vital_name', 'data_type', 'unit', 'is_active', 'is_required'] 
    });
    res.json(updated);
  } catch (err) {
    console.error('Error updating vital:', err); // DEBUG LOG
    res.status(500).json({ error: err.message });
  }
};

// RENAMED: deleteVitalConfig → deleteVitalLibraryItem
exports.deleteVitalLibraryItem = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.query;
  try {
    console.log('Deleting vital library item:', id, clinic_id); // DEBUG LOG
    
    const clinicIdInt = parseInt(clinic_id);
    if (isNaN(clinicIdInt)) {
      return res.status(400).json({ error: 'Invalid clinic_id' });
    }
    
    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Only clinic admins can manage vital library' });
    }
    
    await ClinicVitalConfig.update(
      { is_active: false }, 
      { where: { id, clinic_id: clinicIdInt } }
    );
    res.json({ message: 'Vital removed from library' });
  } catch (err) {
    console.error('Error deleting vital:', err); // DEBUG LOG
    res.status(500).json({ error: err.message });
  }
};

// RENAMED: getActiveVitalConfigs → getClinicVitalLibrary
exports.getClinicVitalLibrary = async (req, res) => {
  const { clinic_id } = req.query;
  try {
    console.log('Fetching vital library for clinic:', clinic_id); // DEBUG LOG
    console.log('User ID:', req.user?.id); // DEBUG LOG
    
    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id parameter is required' });
    }

    const clinicIdInt = parseInt(clinic_id);
    if (isNaN(clinicIdInt)) {
      return res.status(400).json({ error: 'Invalid clinic_id' });
    }

    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Only clinic admins can view vital library' });
    }

    const vitals = await ClinicVitalConfig.findAll({
      // FIX: Explicitly specify the columns to select.
      attributes: ['id', 'clinic_id', 'vital_name', 'data_type', 'unit', 'is_active', 'is_required'],
      where: { clinic_id: clinicIdInt, is_active: true },
      order: [['vital_name', 'ASC']]
    });
    
    console.log('Found vitals:', vitals.length); // DEBUG LOG
    res.json(vitals);
  } catch (err) {
    console.error('Error fetching vitals:', err); // DEBUG LOG
    res.status(500).json({ error: err.message });
  }
};

// KEEP SAME: submitPatientVitals (just add appointment_id support)
exports.submitPatientVitals = async (req, res) => {
  const { clinic_id, clinic_patient_id, recorded_by_admin_id, appointment_id, values } = req.body;
  try {
    const clinicIdInt = parseInt(clinic_id);
    if (isNaN(clinicIdInt)) {
      return res.status(400).json({ error: 'Invalid clinic_id' });
    }

    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const entry = await VitalsEntry.create({
      clinic_id: clinicIdInt,
      clinic_patient_id,
      recorded_by_admin_id,
      appointment_id: appointment_id || null, // ADD THIS
      entry_time: new Date().toLocaleTimeString('en-GB', { hour12: false })
    });

    const records = values.map(v => ({
      vitals_entry_id: entry.id,
      config_id: v.config_id, // KEEP THIS - references clinic_vital_config
      vital_value: v.vital_value
    }));

    await VitalsRecordedValue.bulkCreate(records);
    res.status(201).json({ entry_id: entry.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// KEEP SAME: getPatientVitals (just add appointment filtering)
exports.getPatientVitals = async (req, res) => {
  const { clinic_patient_id } = req.params;
  const { appointment_id, clinic_id } = req.query;
  
  try {
    const whereClause = { clinic_patient_id };
    
    if (appointment_id) {
      whereClause.appointment_id = parseInt(appointment_id);
    }

    if (clinic_id) {
      const clinicIdInt = parseInt(clinic_id);
      if (isNaN(clinicIdInt)) {
        return res.status(400).json({ error: 'Invalid clinic_id' });
      }
      const isAdmin = await isClinicAdmin(req.user.id, clinicIdInt);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      whereClause.clinic_id = clinicIdInt;
    }

    const entries = await VitalsEntry.findAll({
      where: whereClause,
      include: [
        {
          model: VitalsRecordedValue,
          as: 'values',
          include: [
            {
              model: ClinicVitalConfig,
              as: 'config',
              // FIX: Add 'attributes' to the included model to explicitly specify columns.
              attributes: ['id', 'clinic_id', 'vital_name', 'data_type', 'unit', 'is_active', 'is_required']
            }
          ]
        }
      ],
      order: [['entry_date', 'DESC'], ['entry_time', 'DESC']]
    });
    
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NEW: Get vitals for a specific appointment
exports.getVitalsForAppointment = async (req, res) => {
  const { appointment_id } = req.params;
  const { clinic_id } = req.query;
  
  try {
    const clinicIdInt = parseInt(clinic_id);
    if (isNaN(clinicIdInt)) {
      return res.status(400).json({ error: 'Invalid clinic_id' });
    }

    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const entries = await VitalsEntry.findAll({
      where: { appointment_id: parseInt(appointment_id), clinic_id: clinicIdInt },
      include: [
        {
          model: VitalsRecordedValue,
          as: 'values',
          include: [
            {
              model: ClinicVitalConfig,
              as: 'config',
              // FIX: Add 'attributes' to the included model to explicitly specify columns.
              attributes: ['id', 'clinic_id', 'vital_name', 'data_type', 'unit', 'is_active', 'is_required']
            }
          ]
        }
      ]
    });
    
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
