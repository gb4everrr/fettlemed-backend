const { ClinicVitalConfig, VitalsEntry, VitalsRecordedValue, ClinicAdmin, ClinicDoctor } = require('../models');

const isAuthorized = async (userId, clinicId) => {
  const isAdmin = await ClinicAdmin.findOne({ where: { user_id: userId, clinic_id: clinicId, active: true } });
  if (isAdmin) return true;
  const isDoctor = await ClinicDoctor.findOne({ where: { global_doctor_id: userId, clinic_id: clinicId, active: true } });
  return !!isDoctor;
};

exports.createVitalConfig = async (req, res) => {
  const { clinic_id } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const config = await ClinicVitalConfig.create(req.body);
    res.status(201).json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateVitalConfig = async (req, res) => {
  const { id } = req.params;
  const { clinic_id, ...updateFields } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await ClinicVitalConfig.update(updateFields, { where: { id, clinic_id } });
    const updated = await ClinicVitalConfig.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteVitalConfig = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.query;
  try {
    if (!await isAuthorized(req.user.id, parseInt(clinic_id))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await ClinicVitalConfig.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Vital config deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActiveVitalConfigs = async (req, res) => {
  try {
    const config = await ClinicVitalConfig.findAll({
      where: { clinic_id: req.query.clinic_id, is_active: true }
    });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.submitPatientVitals = async (req, res) => {
  const { clinic_id, clinic_patient_id, recorded_by_admin_id, values } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const entry = await VitalsEntry.create({
      clinic_id,
      clinic_patient_id,
      recorded_by_admin_id,
      entry_time: new Date().toLocaleTimeString('en-GB', { hour12: false })
    });

    const records = values.map(v => ({
      vitals_entry_id: entry.id,
      config_id: v.config_id,
      vital_value: v.vital_value
    }));

    await VitalsRecordedValue.bulkCreate(records);
    res.status(201).json({ entry_id: entry.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPatientVitals = async (req, res) => {
  try {
    const entries = await VitalsEntry.findAll({
      where: { clinic_patient_id: req.params.clinic_patient_id },
      include: [
        {
          model: VitalsRecordedValue,
          as: 'values'
        }
      ]
    });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};