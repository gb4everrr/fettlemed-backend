module.exports = (sequelize, DataTypes) => {
  const VitalsEntry = sequelize.define('VitalsEntry', {
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
    // FIX: This now correctly points to the 'vital_entry_id' foreign key
    VitalsEntry.hasMany(models.VitalsRecordedValue, {
      foreignKey: 'vital_entry_id',
      as: 'values'
    });
  };

  return VitalsEntry;
};

