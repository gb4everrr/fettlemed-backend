module.exports = (sequelize, DataTypes) => {
  const AppointmentDiagnosis = sequelize.define('AppointmentDiagnosis', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_patient_id: { type: DataTypes.INTEGER },
    clinic_doctor_id: { type: DataTypes.INTEGER },
    
    diagnosis_catalog_id: { type: DataTypes.INTEGER },
    description: { type: DataTypes.TEXT, allowNull: false },
    code: { type: DataTypes.STRING },
    type: { type: DataTypes.STRING, defaultValue: 'Provisional' },
    
    added_by_user_id: { type: DataTypes.INTEGER },
    added_by_name: { type: DataTypes.STRING },
    
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'appointment_diagnosis',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  AppointmentDiagnosis.associate = (models) => {
    AppointmentDiagnosis.belongsTo(models.Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
  };
  return AppointmentDiagnosis;
};