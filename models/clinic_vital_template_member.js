module.exports = (sequelize, DataTypes) => {
  const ClinicVitalTemplateMember = sequelize.define('ClinicVitalTemplateMember', {
    template_id: { type: DataTypes.INTEGER, allowNull: false },
    vital_config_id: { type: DataTypes.INTEGER, allowNull: false },
    is_required: { type: DataTypes.BOOLEAN, defaultValue: false },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'clinic_vital_template_member',
    timestamps: false
  });

  ClinicVitalTemplateMember.associate = (models) => {
    ClinicVitalTemplateMember.belongsTo(models.ClinicVitalTemplate, {
      foreignKey: 'template_id',
      as: 'template'
    });
    ClinicVitalTemplateMember.belongsTo(models.ClinicVitalConfig, {
      foreignKey: 'vital_config_id',
      as: 'vitalConfig'
    });
  };

  return ClinicVitalTemplateMember;
};