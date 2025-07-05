module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AppointmentSlot', {
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    start_time: { type: DataTypes.TIME, allowNull: false },
    end_time: { type: DataTypes.TIME, allowNull: false },
    is_booked: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'appointment_slot',
    timestamps: false
  });
};