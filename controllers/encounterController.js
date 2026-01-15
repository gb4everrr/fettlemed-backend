const { 
  Appointment, ClinicPatient, PatientAllergy, ConsultationNote, 
  Prescription, VitalsEntry, VitalsRecordedValue, ClinicVitalConfig,
  LabOrder, AppointmentDiagnosis, DrugCatalog, DiagnosisCatalog, LabCatalog
} = require('../models');
const { Op } = require('sequelize');

// --- 1. Aggregated Fetch (The "One Big Call" for the Modal) ---
exports.getEncounterDetails = async (req, res) => {
  const { appointmentId } = req.params;
  const { clinic_id } = req.query;

  try {
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { 
            model: ClinicPatient, 
            as: 'patient' 
        },
        // Fetch existing vitals with EXPLICIT attributes to prevent column errors
        { 
          model: VitalsEntry, 
          as: 'vitals',
          required: false,
          attributes: ['id', 'entry_date', 'entry_time', 'recorded_by_admin_id'],
          include: [{ 
            model: VitalsRecordedValue, 
            as: 'values',
            attributes: ['id', 'vital_value', 'config_id'],
            include: [{ 
                model: ClinicVitalConfig, 
                as: 'config',
                attributes: ['vital_name', 'unit'] 
            }]
          }]
        }
      ]
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    
    // Parallel fetch for related encounter data
    const [allergies, note, prescription, labOrders, diagnoses] = await Promise.all([
      PatientAllergy.findAll({ where: { clinic_patient_id: appointment.clinic_patient_id } }),
      ConsultationNote.findOne({ where: { appointment_id: appointmentId } }),
      Prescription.findOne({ where: { appointment_id: appointmentId } }),
      LabOrder.findAll({ where: { appointment_id: appointmentId } }),
      AppointmentDiagnosis.findAll({ where: { appointment_id: appointmentId } })
    ]);

    res.json({
      appointment,
      allergies,
      note, // Will handle JSON parsing in frontend
      prescription, // Will handle JSON parsing in frontend
      labOrders,
      diagnoses
    });

  } catch (err) {
    console.error("Encounter fetch error:", err);
    res.status(500).json({ error: err.message });
  }
};

// --- 2. Search Catalogs (For Autocomplete) ---

exports.searchDrugs = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  
  try {
    const results = await DrugCatalog.findAll({
      where: { 
        name: { [Op.iLike]: `%${q}%` },
        is_active: true
      },
      limit: 20
    });
    res.json(results);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.searchDiagnoses = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  
  try {
    const results = await DiagnosisCatalog.findAll({
      where: { 
        [Op.or]: [
          { description: { [Op.iLike]: `%${q}%` } },
          { code: { [Op.iLike]: `${q}%` } }
        ]
      },
      limit: 20
    });
    res.json(results);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.searchLabs = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  
  try {
    const results = await LabCatalog.findAll({
      where: { 
        test_name: { [Op.iLike]: `%${q}%` },
        is_active: true
      },
      limit: 20
    });
    res.json(results);
  } catch(err) { res.status(500).json({error: err.message}); }
};

// --- 3. Transactional Actions ---

exports.addDiagnosis = async (req, res) => {
  try {
    const data = req.body; 
    const newItem = await AppointmentDiagnosis.create(data);
    res.status(201).json(newItem);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.removeDiagnosis = async (req, res) => {
  try {
    await AppointmentDiagnosis.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.addLabOrder = async (req, res) => {
  try {
    const data = req.body; 
    const newItem = await LabOrder.create(data);
    res.status(201).json(newItem);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.removeLabOrder = async (req, res) => {
  try {
    await LabOrder.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};