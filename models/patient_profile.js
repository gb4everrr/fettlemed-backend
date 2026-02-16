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
    }
  }, {
    tableName: 'patient_profile',
    timestamps: false
  });

  return PatientProfile;
};