module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('patient', 'doctor', 'clinic_admin', 'admin'),
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'users',        
    freezeTableName: true,     
    timestamps: true           
  });

  User.associate = (models) => {
    User.hasOne(models.DoctorProfile, {
      foreignKey: 'user_id',
      as: 'doctorProfile'
    });
  };

  return User;
};
