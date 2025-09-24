module.exports = (sequelize, DataTypes) => {
  const ConsultationNote = sequelize.define('ConsultationNote', {
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    // Including legacy columns to match the table exactly
    patient_profile_id: { type: DataTypes.INTEGER },
    doctor_profile_id: { type: DataTypes.INTEGER },
    // Correcting the column name from 'notes' to 'note'
    note: { type: DataTypes.TEXT, allowNull: false }, 
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

