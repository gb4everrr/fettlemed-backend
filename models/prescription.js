module.exports = (sequelize, DataTypes) => {
  const Prescription = sequelize.define('Prescription', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    patient_profile_id: { type: DataTypes.INTEGER },
    doctor_profile_id: { type: DataTypes.INTEGER },
    symptoms: { type: DataTypes.TEXT },
    provisional_diagnosis: { type: DataTypes.TEXT },
    investigations: { type: DataTypes.TEXT },
    clinical_summary: { type: DataTypes.TEXT },
    final_diagnosis: { type: DataTypes.TEXT },
    // Correcting the column name from 'medicines' to 'prescription'
    prescription: { type: DataTypes.TEXT, allowNull: false }, 
    original_copy: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'prescription',
    timestamps: false
  });

  Prescription.associate = (models) => {
    Prescription.belongsTo(models.Appointment, {
      foreignKey: 'appointment_id',
      as: 'appointment'
    });
  };

  return Prescription;
};

