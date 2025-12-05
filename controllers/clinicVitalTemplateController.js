const { ClinicVitalTemplate, ClinicVitalTemplateMember, ClinicVitalConfig } = require('../models');

// Get all templates for a clinic with their members
exports.getTemplates = async (req, res) => {
  const { clinic_id } = req.query;
  try {
    const templates = await ClinicVitalTemplate.findAll({
      where: { clinic_id },
      include: [{
        model: ClinicVitalTemplateMember,
        as: 'members',
        include: [{
          model: ClinicVitalConfig,
          as: 'vitalConfig',
          attributes: ['id', 'vital_name', 'unit', 'data_type']
        }]
      }],
      order: [['template_name', 'ASC']]
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new template with vitals
exports.createTemplate = async (req, res) => {
  const { clinic_id, template_name, description, members } = req.body;
  
  try {
    const template = await ClinicVitalTemplate.create({
      clinic_id,
      template_name,
      description
    });

    if (members && members.length > 0) {
      const memberData = members.map((m, index) => ({
        template_id: template.id,
        vital_config_id: m.vital_config_id,
        is_required: m.is_required || false,
        sort_order: index
      }));
      await ClinicVitalTemplateMember.bulkCreate(memberData);
    }

    // Return the full object
    const created = await ClinicVitalTemplate.findByPk(template.id, {
        include: [{ model: ClinicVitalTemplateMember, as: 'members' }]
    });
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { clinic_id, template_name, description, members } = req.body;

  try {
    // 1. Verify template existence
    const template = await ClinicVitalTemplate.findOne({ 
        where: { id, clinic_id } 
    });

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    // 2. Update basic info
    await template.update({ template_name, description });

    // 3. Update Members (Delete old -> Create new)
    if (members) {
        // Remove existing members
        await ClinicVitalTemplateMember.destroy({ where: { template_id: id } });

        // Add new members
        if (members.length > 0) {
            const memberData = members.map((m, index) => ({
                template_id: id,
                vital_config_id: m.vital_config_id,
                is_required: m.is_required || false,
                sort_order: index
            }));
            await ClinicVitalTemplateMember.bulkCreate(memberData);
        }
    }

    // 4. Return updated object (FIXED SECTION)
    const updated = await ClinicVitalTemplate.findByPk(id, {
        include: [{ 
            model: ClinicVitalTemplateMember, 
            as: 'members',
            include: [{ 
                model: ClinicVitalConfig, 
                as: 'vitalConfig',
                // FIX: Explicitly list columns to prevent 'clinic_doctor_id' error
                attributes: ['id', 'vital_name', 'unit', 'data_type'] 
            }] 
        }]
    });

    res.json(updated);
  } catch (err) {
    console.error('Update Template Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTemplate = async (req, res) => {
    const { id } = req.params;
    try {
        await ClinicVitalTemplate.destroy({ where: { id } });
        res.json({ message: 'Template deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};