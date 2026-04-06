module.exports = (sequelize, DataTypes) => {
  const PhrVital = sequelize.define('PhrVital', {
    patient_profile_id: { type: DataTypes.INTEGER, allowNull: false },
    upload_id: { type: DataTypes.INTEGER, allowNull: true },
    vital_name: { type: DataTypes.STRING, allowNull: false },
    vital_value: { type: DataTypes.STRING, allowNull: false },
    unit: { type: DataTypes.STRING, allowNull: true },
    recorded_at: { type: DataTypes.DATE, allowNull: false }, // The actual document date
  }, {
    tableName: 'phr_vitals',
    timestamps: true
  });

  PhrVital.associate = (models) => {
    PhrVital.belongsTo(models.PatientProfile, { foreignKey: 'patient_profile_id', as: 'patient' });
    PhrVital.belongsTo(models.ReportUpload, { foreignKey: 'upload_id', as: 'sourceDocument' });
  };

  return PhrVital;
};