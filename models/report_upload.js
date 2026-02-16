module.exports = (sequelize, DataTypes) => {
  const ReportUpload = sequelize.define('ReportUpload', {
    // FK → patient_profile.id
    patient_profile_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    report_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    upload_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // timestamp without time zone in DB
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'report_upload',
    timestamps: false
  });

  ReportUpload.associate = (models) => {
    ReportUpload.belongsTo(models.PatientProfile, {
      foreignKey: 'patient_profile_id',
      as: 'patientProfile'
    });
    ReportUpload.hasOne(models.DocumentOcrData, {
      foreignKey: 'upload_id',
      as: 'ocrData'
    });
  };

  return ReportUpload;
};