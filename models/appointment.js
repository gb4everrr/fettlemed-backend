module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define('Appointment', {
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    // This refers to clinic_patient.id, not users.id
    clinic_patient_id: { type: DataTypes.INTEGER, allowNull: false }, // Renamed for clarity
    clinic_doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    slot_id: { type: DataTypes.INTEGER, allowNull: false },
    datetime_start: { type: DataTypes.DATE, allowNull: false },
    datetime_end: { type: DataTypes.DATE, allowNull: false },
    invoice_no: { type: DataTypes.INTEGER },
    status: { type: DataTypes.INTEGER, defaultValue: 0 },
    notes: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'appointment',
    timestamps: false
  });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.ClinicDoctor, {
      foreignKey: 'clinic_doctor_id',
      as: 'doctor'
    });
    // Reference ClinicPatient model
    Appointment.belongsTo(models.ClinicPatient, {
      foreignKey: 'clinic_patient_id', // This should match your DB column name
      as: 'patient'
    });
    Appointment.hasMany(models.VitalsEntry, {
      foreignKey: 'appointment_id',
      as: 'vitals'
    });
    Appointment.belongsTo(models.AppointmentSlot, {
      foreignKey: 'slot_id',
      as: 'appointment_slot' // The alias we will use in queries
    });
    Appointment.belongsTo(models.Clinic, {
      foreignKey: 'clinic_id',
      as: 'clinic'
    });
    Appointment.hasOne(models.ConsultationNote, {
      foreignKey: 'appointment_id',
      as: 'consultation_note'
    });
    Appointment.hasOne(models.Prescription, {
      foreignKey: 'appointment_id',
      as: 'prescription'
    });
  };

  return Appointment;
};