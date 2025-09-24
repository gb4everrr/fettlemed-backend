module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AvailabilityException', {
    clinic_doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    start_time: { type: DataTypes.TIME, allowNull: false }, // ADDED
    end_time: { type: DataTypes.TIME, allowNull: false },   // ADDED
    is_available: { type: DataTypes.BOOLEAN, defaultValue: false },
    note: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'availability_exception',
    timestamps: false
  });
};