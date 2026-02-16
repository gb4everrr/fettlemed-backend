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
      type: DataTypes.TEXT,
      allowNull: false
    },
    // DB stores as character varying, not a PG ENUM — keep as STRING
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Added: exists in DB (text, nullable) but was missing from model
    profile_image_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // ABDM Field: 0=Unverified, 1=Mobile, 2=ABHA/Aadhaar
    kyc_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'users',
    freezeTableName: true,
    // The DB has both snake_case (created_at/updated_at) and camelCase
    // (createdAt/updatedAt) columns — a legacy duplicate mess that has been
    // cleaned from both DBs per session notes. After the cleanup only the
    // snake_case columns remain, so we disable Sequelize's auto-timestamp
    // management and declare them manually to avoid Sequelize trying to write
    // to camelCase columns that no longer exist.
    timestamps: false,
    createdAt: false,
    updatedAt: false
  });

  User.associate = (models) => {
    User.hasOne(models.DoctorProfile, {
      foreignKey: 'user_id',
      as: 'doctorProfile'
    });
  };

  return User;
};