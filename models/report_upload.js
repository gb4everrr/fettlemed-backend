module.exports = (sequelize, DataTypes) => {
  const ReportUpload = sequelize.define('ReportUpload', {
    patient_profile_id: { type: DataTypes.INTEGER, allowNull: true },
    report_type: { type: DataTypes.STRING, allowNull: true },
    upload_url: { type: DataTypes.TEXT, allowNull: true },
    original_filename: { type: DataTypes.STRING, allowNull: true },
    file_hash: { type: DataTypes.STRING(64), allowNull: true },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'PENDING',
      validate: {
        isIn: [['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW', 'DUPLICATE']]
      },
      allowNull: false
    },
    uploaded_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'report_upload',
    timestamps: false
  });

  ReportUpload.associate = (models) => {
    ReportUpload.belongsTo(models.PatientProfile,    { foreignKey: 'patient_profile_id', as: 'patientProfile'   });
    ReportUpload.hasOne(models.DocumentOcrData,      { foreignKey: 'upload_id',          as: 'ocrData'          });
    ReportUpload.hasMany(models.PhrVital,            { foreignKey: 'upload_id',          as: 'phrVitals'        });
    ReportUpload.hasMany(models.PhrMedication,       { foreignKey: 'upload_id',          as: 'phrMedications'   });
    ReportUpload.hasMany(models.PhrEncounter,        { foreignKey: 'upload_id',          as: 'phrEncounters'    });
    ReportUpload.hasMany(models.PhrImagingReport,    { foreignKey: 'upload_id',          as: 'phrImagingReports'});
  };

  return ReportUpload;
};