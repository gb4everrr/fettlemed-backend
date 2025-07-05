module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AvailabilityException', {
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    is_available: { type: DataTypes.BOOLEAN, defaultValue: false },
    note: { type: DataTypes.STRING }
  }, {
    tableName: 'availability_exception',
    timestamps: false
  });
};
