module.exports = (sequelize, DataTypes) => {
  const ClinicPatient = sequelize.define('ClinicPatient', {
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    global_patient_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergency_contact: {
      type: DataTypes.STRING,
      allowNull: true
    },
    patient_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    clinic_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    registered_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'clinic_patient',
    freezeTableName: true,
    timestamps: false
  });

  return ClinicPatient;
};