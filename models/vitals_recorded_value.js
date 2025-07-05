module.exports = (sequelize, DataTypes) => {
  return sequelize.define('VitalsRecordedValue', {
    vitals_entry_id: { type: DataTypes.INTEGER, allowNull: false },
    config_id: { type: DataTypes.INTEGER, allowNull: false },
    vital_value: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'vitals_recorded_value',
    timestamps: false
  });
};