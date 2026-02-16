module.exports = (sequelize, DataTypes) => {
  const ClinicVitalTemplate = sequelize.define('ClinicVitalTemplate', {
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    template_name: { type: DataTypes.STRING, allowNull: false },
    // DB column is `text`, not varchar — was incorrectly DataTypes.STRING
    description: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'clinic_vital_template',
    // DB columns are camelCase (createdAt / updatedAt) — Sequelize default matches
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