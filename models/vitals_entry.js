module.exports = (sequelize, DataTypes) => {
  const VitalsEntry = sequelize.define('VitalsEntry', {
    // FIX: Add the primary key definition
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_patient_id: { type: DataTypes.INTEGER, allowNull: false },
    entry_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    entry_time: { type: DataTypes.TIME },
    recorded_by_admin_id: { type: DataTypes.INTEGER },
    appointment_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'vitals_entry',
    timestamps: false
  });

  VitalsEntry.associate = (models) => {
    VitalsEntry.belongsTo(models.Appointment, {
      foreignKey: 'appointment_id',
      as: 'appointment'
    });
   
    VitalsEntry.hasMany(models.VitalsRecordedValue, {
      foreignKey: 'vitals_entry_id',
      as: 'values'
    });
  };

  return VitalsEntry;
};