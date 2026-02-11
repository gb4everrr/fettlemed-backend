module.exports = (sequelize, DataTypes) => {
  const PatientProfile = sequelize.define('PatientProfile', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
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
    }
  }, {
    tableName: 'patient_profile',
    timestamps: false
  });

  return PatientProfile;
};