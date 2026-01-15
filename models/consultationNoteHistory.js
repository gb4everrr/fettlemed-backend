module.exports = (sequelize, DataTypes) => {
  const ConsultationNoteHistory = sequelize.define('ConsultationNoteHistory', {
    consultation_note_id: { type: DataTypes.INTEGER, allowNull: false },
    updated_by_id: { type: DataTypes.INTEGER }, // This refers to clinic_doctor.id
    
    subjective: { type: DataTypes.TEXT },
    objective: { type: DataTypes.TEXT },
    observations_private: { type: DataTypes.TEXT },
    
    change_reason: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'consultation_note_history',
    timestamps: false
  });

  ConsultationNoteHistory.associate = (models) => {
    ConsultationNoteHistory.belongsTo(models.ConsultationNote, { foreignKey: 'consultation_note_id' });
    // FIXED: Association to ClinicDoctor
    ConsultationNoteHistory.belongsTo(models.ClinicDoctor, { foreignKey: 'updated_by_id', as: 'editor' });
  };

  return ConsultationNoteHistory;
};