module.exports = (sequelize, DataTypes) => {
  const PatientAllergy = sequelize.define('PatientAllergy', {
    clinic_patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clinic_patient', // Matches your existing table name
        key: 'id'
      }
    },
    allergy_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('mild', 'moderate', 'severe', 'unknown'),
      defaultValue: 'unknown'
    },
    reaction: {
      type: DataTypes.STRING,
      allowNull: true
    },
    recorded_by: {
      type: DataTypes.INTEGER, 
      allowNull: false
    }
  }, {
    tableName: 'patient_allergies',
    timestamps: true,
    createdAt: 'created_at', // <--- FIX: Maps Sequelize's createdAt to DB's created_at
    updatedAt: 'updated_at', // <--- FIX: Maps Sequelize's updatedAt to DB's updated_at
    indexes: [
      { fields: ['clinic_patient_id'] } 
    ]
  });

  PatientAllergy.associate = (models) => {
    PatientAllergy.belongsTo(models.ClinicPatient, { foreignKey: 'clinic_patient_id', as: 'patient' });
  };

  return PatientAllergy;
};