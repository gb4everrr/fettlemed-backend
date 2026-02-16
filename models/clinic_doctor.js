module.exports = (sequelize, DataTypes) => {
  const ClinicDoctor = sequelize.define('ClinicDoctor', {
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clinic',
        key: 'id'
      }
    },
    global_doctor_id: {
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
    medical_reg_no: {
      type: DataTypes.STRING,
      allowNull: true
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // DB column is `date` (date-only), not timestamptz — was incorrectly DATE
    started_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    assigned_role: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'DOCTOR'
    }
  }, {
    tableName: 'clinic_doctor',
    freezeTableName: true,
    timestamps: false
  });

  ClinicDoctor.associate = (models) => {
    // Removed: hasMany(ClinicVitalConfig) — clinic_vital_config has no
    // clinic_doctor_id column in the DB; that association was invalid.
    ClinicDoctor.hasMany(models.Appointment, {
      foreignKey: 'clinic_doctor_id',
      as: 'appointments'
    });
    ClinicDoctor.belongsTo(models.Clinic, {
      foreignKey: 'clinic_id',
      as: 'Clinic'
    });
  };

  return ClinicDoctor;
};