module.exports = (sequelize, DataTypes) => {
  const PhrImagingReport = sequelize.define('PhrImagingReport', {
    patient_profile_id: { type: DataTypes.INTEGER, allowNull: false },
    upload_id:          { type: DataTypes.INTEGER, allowNull: true  },
    modality:           { type: DataTypes.STRING,  allowNull: true  }, // MRI | CT | X-Ray | Ultrasound | PET
    body_part:          { type: DataTypes.STRING,  allowNull: true  }, // e.g. "Chest", "Left Knee"
    impression:         { type: DataTypes.TEXT,    allowNull: true  }, // Radiologist's summary conclusion
    findings:           { type: DataTypes.TEXT,    allowNull: true  }, // Detailed observations
    reported_by:        { type: DataTypes.STRING,  allowNull: true  }, // Radiologist name if present
    report_date:        { type: DataTypes.DATEONLY, allowNull: true  },
  }, {
    tableName: 'phr_imaging_reports',
    timestamps: true, // camelCase createdAt/updatedAt — consistent with phr_vitals/phr_medications
  });

  PhrImagingReport.associate = (models) => {
    PhrImagingReport.belongsTo(models.PatientProfile, {
      foreignKey: 'patient_profile_id',
      as: 'patient',
    });
    PhrImagingReport.belongsTo(models.ReportUpload, {
      foreignKey: 'upload_id',
      as: 'sourceDocument',
    });
  };

  return PhrImagingReport;
};