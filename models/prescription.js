module.exports = (sequelize, DataTypes) => {
  const Prescription = sequelize.define('Prescription', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },

    // RENAMED FIELDS (Context Specific)
    clinic_patient_id: { type: DataTypes.INTEGER },
    clinic_doctor_id: { type: DataTypes.INTEGER },

    drug_catalog_id: { type: DataTypes.INTEGER },
    drug_name: { type: DataTypes.TEXT, allowNull: false },
    dose: { type: DataTypes.STRING },
    frequency: { type: DataTypes.STRING },
    duration: { type: DataTypes.STRING },
    instructions: { type: DataTypes.TEXT },
    
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    
    // Timestamps required by Sequelize
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'prescription',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Prescription.associate = (models) => {
    Prescription.belongsTo(models.Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
    
    // UPDATED ASSOCIATION: Links to ClinicDoctor via the new column
    Prescription.belongsTo(models.ClinicDoctor, { 
        foreignKey: 'clinic_doctor_id', 
        as: 'doctor' 
    });
  };

  return Prescription;
};