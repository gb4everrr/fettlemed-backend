// gb4everrr/fettlemed-backend/models/clinic_admin.js
module.exports = (sequelize, DataTypes) => {
  const ClinicAdmin = sequelize.define('ClinicAdmin', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'clinic_admin',
    timestamps: false
  });

  // ADDED: Association definition
  ClinicAdmin.associate = (models) => {
    ClinicAdmin.belongsTo(models.User, {
      foreignKey: 'user_id', // foreign key in ClinicAdmin model
      as: 'user',            // alias for eager loading
    });
    ClinicAdmin.belongsTo(models.Clinic, {
      foreignKey: 'clinic_id', // foreign key in ClinicAdmin model
      as: 'clinic',            // alias for eager loading
    });
  };

  return ClinicAdmin;
};