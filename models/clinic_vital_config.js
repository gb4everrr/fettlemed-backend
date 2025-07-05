module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ClinicVitalConfig', {
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    vital_name: { type: DataTypes.STRING, allowNull: false },
    data_type: { type: DataTypes.STRING }, // 'string', 'number', etc.
    unit: { type: DataTypes.STRING },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_required: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'clinic_vital_config',
    timestamps: false
  });
};