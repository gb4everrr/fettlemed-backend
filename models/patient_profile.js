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
    }
  }, {
    tableName: 'patient_profile',
    timestamps: false
  });

  return PatientProfile;
};
