module.exports = (sequelize, DataTypes) => {
  const PatientProfile = sequelize.define('PatientProfile', {
    // DB is_nullable: YES — was incorrectly allowNull: false
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // DB is_nullable: YES — was incorrectly allowNull: false
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergency_contact: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // ABDM Fields
    abha_number: {
      type: DataTypes.STRING(14),
      allowNull: true,
      unique: true
    },
    abha_address: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true
    },
    blood_type: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
   {
    tableName: 'patient_profile',
    timestamps: false
  });
  PatientProfile.associate = (models) => {
    PatientProfile.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return PatientProfile;
};