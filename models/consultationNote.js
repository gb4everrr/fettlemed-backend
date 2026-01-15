module.exports = (sequelize, DataTypes) => {
  const ConsultationNote = sequelize.define('ConsultationNote', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_patient_id: { type: DataTypes.INTEGER },
    clinic_doctor_id: { type: DataTypes.INTEGER },
    
    // REPLACED single 'note' with the 3 fields you requested
    subjective: { type: DataTypes.TEXT },
    objective: { type: DataTypes.TEXT },
    observations_private: { type: DataTypes.TEXT }, // Doctor only
    diagnosis_comments: DataTypes.TEXT,
    
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'consultation_note',
    timestamps: false
  });

  ConsultationNote.associate = (models) => {
    ConsultationNote.belongsTo(models.Appointment, {
      foreignKey: 'appointment_id',
      as: 'appointment'
    });
  };

  return ConsultationNote;
};