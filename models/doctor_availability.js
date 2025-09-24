module.exports = (sequelize, DataTypes) => {
  return sequelize.define('DoctorAvailability', {
    // Change the column name to match the database
    clinic_doctor_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    weekday: { type: DataTypes.STRING, allowNull: false },
    start_time: { type: DataTypes.TIME, allowNull: false },
    end_time: { type: DataTypes.TIME, allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'doctor_availability',
    timestamps: false
  });
};