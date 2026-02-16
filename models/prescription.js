module.exports = (sequelize, DataTypes) => {
  const Prescription = sequelize.define('Prescription', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: true },
    clinic_patient_id: { type: DataTypes.INTEGER, allowNull: true },
    clinic_doctor_id: { type: DataTypes.INTEGER, allowNull: true },

    // Orphaned columns (symptoms, provisional_diagnosis, investigations,
    // clinical_summary, final_diagnosis) have been dropped from both DBs
    // and are intentionally excluded here.

    drug_catalog_id: { type: DataTypes.INTEGER, allowNull: true },
    drug_name: { type: DataTypes.TEXT, allowNull: false },
    dose: { type: DataTypes.STRING, allowNull: true },
    frequency: { type: DataTypes.STRING, allowNull: true },
    duration: { type: DataTypes.STRING, allowNull: true },
    instructions: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }

    // Do NOT redeclare created_at / updated_at as explicit fields here —
    // timestamps: true with createdAt/updatedAt mapping handles them.
    // Double-declaring causes Sequelize to error on duplicate column definitions.
  }, {
    tableName: 'prescription',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Prescription.associate = (models) => {
    Prescription.belongsTo(models.Appointment, {
      foreignKey: 'appointment_id',
      as: 'appointment'
    });
    Prescription.belongsTo(models.ClinicDoctor, {
      foreignKey: 'clinic_doctor_id',
      as: 'doctor'
    });
  };

  return Prescription;
};