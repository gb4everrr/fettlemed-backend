module.exports = (sequelize, DataTypes) => {
  const ClinicVitalConfig = sequelize.define('ClinicVitalConfig', {
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    vital_name: { type: DataTypes.STRING, allowNull: false },
    data_type: { type: DataTypes.STRING },
    unit: { type: DataTypes.STRING },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_required: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'clinic_vital_config',
    timestamps: false
  });

  ClinicVitalConfig.associate = (models) => {
    ClinicVitalConfig.hasMany(models.DoctorVitalAssignment, {
      foreignKey: 'vital_config_id',
      as: 'assignments'
    });
    ClinicVitalConfig.hasMany(models.VitalsRecordedValue, {
      foreignKey: 'config_id',
      as: 'recordedValues'
    });
  };

  return ClinicVitalConfig;
};