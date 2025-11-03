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

// FIXED: submitPatientVitals - Now saves config_id
exports.submitPatientVitals = async (req, res) => {
  const { clinic_id, clinic_patient_id, recorded_by_admin_id, appointment_id, values } = req.body;
  try {
    console.log('=== Submit Vitals Debug ===');
    console.log('Request body:', { clinic_id, clinic_patient_id, recorded_by_admin_id, appointment_id, values });
    
    const clinicIdInt = parseInt(clinic_id);
    if (isNaN(clinicIdInt)) {
      return res.status(400).json({ error: 'Invalid clinic_id' });
    }

    if (!await isClinicAdmin(req.user.id, clinicIdInt)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // First, delete any existing vitals entry for this appointment
    if (appointment_id) {
      const existingEntries = await VitalsEntry.findAll({
        where: { appointment_id: parseInt(appointment_id), clinic_id: clinicIdInt }
      });
      
      console.log('Found existing entries:', existingEntries.length);
      
      for (const entry of existingEntries) {
        await VitalsRecordedValue.destroy({ where: { vitals_entry_id: entry.id } });
        await entry.destroy();
      }
    }

    // Create new vitals entry
    console.log('Creating vitals entry...');
    const entry = await VitalsEntry.create({
      clinic_id: clinicIdInt,
      clinic_patient_id: parseInt(clinic_patient_id),
      recorded_by_admin_id: parseInt(recorded_by_admin_id),
      appointment_id: appointment_id ? parseInt(appointment_id) : null,
      entry_time: new Date().toLocaleTimeString('en-GB', { hour12: false })
    });

    console.log('Created entry with ID:', entry.id);
    console.log('Entry details:', entry.toJSON());

    // --- START OF FIX ---
    // Create records using config_id directly
    const records = values.map(v => ({
      vitals_entry_id: entry.id,
      config_id: parseInt(v.config_id), // Use config_id
      vital_value: v.vital_value
    }));
    // --- END OF FIX ---

    console.log('Creating recorded values:', records);

    await VitalsRecordedValue.bulkCreate(records);
    
    console.log('Successfully created vitals entry');
    res.status(201).json({ entry_id: entry.id });
  } catch (err) {
    console.error('Error submitting vitals:', err);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      sql: err.sql,
      original: err.original
    });
    res.status(500).json({ error: err.message });
  }
};

// FIXED: getPatientVitals - Now properly includes config to get vital_name
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
          // --- START OF FIX ---
          attributes: ['id', 'vitals_entry_id', 'vital_value', 'config_id'], // Select config_id
          include: [
            {
              model: ClinicVitalConfig, // Include the config model
              as: 'config',
              attributes: ['vital_name', 'unit'] // Get the name and unit from config
            }
          ]
          // --- END OF FIX ---
        }
      ],
      order: [['entry_date', 'DESC'], ['entry_time', 'DESC']]
    });
    
    res.json(entries);
  } catch (err)
 {
    console.error('Error fetching patient vitals:', err);
    res.status(500).json({ error: err.message });
  }
};

// FIXED: Get vitals for a specific appointment
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
          // --- START OF FIX ---
          attributes: ['id', 'vitals_entry_id', 'vital_value', 'config_id'], // Select config_id
          include: [
            {
              model: ClinicVitalConfig, // Include the config model
              as: 'config',
              attributes: ['vital_name', 'unit'] // Get the name and unit from config
            }
          ]
          // --- END OF FIX ---
        }
      ],
      order: [['entry_date', 'DESC'], ['entry_time', 'DESC']]
    });
    
    res.json(entries);
  } catch (err) {
    console.error('Error fetching appointment vitals:', err);
    res.status(500).json({ error: err.message });
  }
};