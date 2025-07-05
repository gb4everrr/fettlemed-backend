module.exports = (sequelize, DataTypes) => {
  return sequelize.define('VitalsEntry', {
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_patient_id: { type: DataTypes.INTEGER, allowNull: false },
    entry_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    entry_time: { type: DataTypes.TIME },
    recorded_by_admin_id: { type: DataTypes.INTEGER }
  }, {
    tableName: 'vitals_entry',
    timestamps: false
  });
};