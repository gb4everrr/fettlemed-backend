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
    started_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'clinic_doctor',
    freezeTableName: true,
    timestamps: false
  });

  // ADD THIS ASSOCIATE FUNCTION
  ClinicDoctor.associate = (models) => {
    ClinicDoctor.hasMany(models.ClinicVitalConfig, {
      foreignKey: 'clinic_doctor_id',
      as: 'vitalConfigs'
    });
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