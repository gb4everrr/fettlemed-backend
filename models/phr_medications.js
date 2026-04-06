module.exports = (sequelize, DataTypes) => {
  const PhrMedication = sequelize.define('PhrMedication', {
    patient_profile_id: { type: DataTypes.INTEGER, allowNull: false },
    upload_id:          { type: DataTypes.INTEGER, allowNull: true  },
    medication_name:    { type: DataTypes.STRING,  allowNull: false },
    dosage:             { type: DataTypes.STRING,  allowNull: true  }, // e.g. "500mg"
    frequency:          { type: DataTypes.STRING,  allowNull: true  }, // e.g. "Twice daily"
    duration:           { type: DataTypes.STRING,  allowNull: true  }, // e.g. "7 days"
    prescribed_by:      { type: DataTypes.STRING,  allowNull: true  }, // Doctor name if present
    prescribed_at:      { type: DataTypes.DATE,    allowNull: true  }, // Document date
  }, {
    tableName: 'phr_medications',
    timestamps: true,
  });

  PhrMedication.associate = (models) => {
    PhrMedication.belongsTo(models.PatientProfile, {
      foreignKey: 'patient_profile_id',
      as: 'patient',
    });
    PhrMedication.belongsTo(models.ReportUpload, {
      foreignKey: 'upload_id',
      as: 'sourceDocument',
    });
  };

  return PhrMedication;
};