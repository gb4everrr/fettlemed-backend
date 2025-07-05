module.exports = (sequelize, DataTypes) => {
  return sequelize.define('DoctorAvailability', {
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    day_of_week: { type: DataTypes.STRING, allowNull: false }, // e.g., 'Monday'
    start_time: { type: DataTypes.TIME, allowNull: false },
    end_time: { type: DataTypes.TIME, allowNull: false }
  }, {
    tableName: 'doctor_availability',
    timestamps: false
  });
};