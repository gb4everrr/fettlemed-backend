module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Prescription', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    patient_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    medicines: { type: DataTypes.TEXT, allowNull: false }, // Store JSON string
    notes: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'prescription',
    timestamps: false
  });
};
