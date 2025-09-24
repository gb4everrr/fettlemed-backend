module.exports = (sequelize, DataTypes) => {
  const DoctorProfile = sequelize.define('DoctorProfile', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    medical_reg_no: {
      type: DataTypes.STRING,
      allowNull: false
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'doctor_profile',
    timestamps: false
  });

  DoctorProfile.associate = (models) => {
    DoctorProfile.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return DoctorProfile;
};
