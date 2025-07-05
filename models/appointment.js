module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Appointment', {
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    patient_id: { type: DataTypes.INTEGER, allowNull: false },
    appointment_slot_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.INTEGER, defaultValue: 0 }, // 0 = pending, 1 = confirmed, 2 = cancelled
    notes: { type: DataTypes.STRING }
  }, {
    tableName: 'appointment',
    timestamps: false
  });
};