module.exports = (sequelize, DataTypes) => {
  const DoctorProfile = sequelize.define('DoctorProfile', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // DB is_nullable: YES for both — was incorrectly allowNull: false
    medical_reg_no: {
      type: DataTypes.STRING,
      allowNull: true
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // ABDM Field: Healthcare Professional Registry ID
    hpr_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
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