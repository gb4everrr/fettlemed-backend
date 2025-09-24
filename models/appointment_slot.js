module.exports = (sequelize, DataTypes) => {
  // Define the model first
  const AppointmentSlot = sequelize.define('AppointmentSlot', {
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: false },
    booked: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'appointment_slot',
    timestamps: false
  });

  // --- ADD THIS ENTIRE METHOD ---
  // This defines the "one-to-many" relationship from the slot's perspective.
  AppointmentSlot.associate = (models) => {
    AppointmentSlot.hasMany(models.Appointment, {
      foreignKey: 'slot_id',
      as: 'appointments'
    });
  };

  // Return the model
  return AppointmentSlot;
};
