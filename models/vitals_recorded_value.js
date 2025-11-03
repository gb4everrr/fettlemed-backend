module.exports = (sequelize, DataTypes) => {
  const VitalsRecordedValue = sequelize.define('VitalsRecordedValue', {
    vitals_entry_id: { type: DataTypes.INTEGER, allowNull: false },
    config_id: { type: DataTypes.INTEGER, allowNull: false }, // Foreign key to clinic_vital_config
    vital_value: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'vitals_recorded_value',
    timestamps: false
  });

  VitalsRecordedValue.associate = (models) => {
    VitalsRecordedValue.belongsTo(models.VitalsEntry, {
      foreignKey: 'vitals_entry_id',
      as: 'entry'
    });
    
    // NEW: Add relationship to config
    VitalsRecordedValue.belongsTo(models.ClinicVitalConfig, {
      foreignKey: 'config_id',
      as: 'config'
    });
  };

  return VitalsRecordedValue;
};