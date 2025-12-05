module.exports = (sequelize, DataTypes) => {
  const ClinicVitalTemplate = sequelize.define('ClinicVitalTemplate', {
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    template_name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING }
  }, {
    tableName: 'clinic_vital_template',
    timestamps: true
  });

  ClinicVitalTemplate.associate = (models) => {
    ClinicVitalTemplate.hasMany(models.ClinicVitalTemplateMember, {
      foreignKey: 'template_id',
      as: 'members',
      onDelete: 'CASCADE'
    });
  };

  return ClinicVitalTemplate;
};