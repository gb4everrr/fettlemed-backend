// gb4everrr/fettlemed-backend/models/clinic_admin.js
module.exports = (sequelize, DataTypes) => {
  const ClinicAdmin = sequelize.define('ClinicAdmin', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    
    // The Base Role
    role: {
      type: DataTypes.ENUM('OWNER', 'CLINIC_ADMIN', 'DOCTOR','DOCTOR_OWNER',   
        'DOCTOR_PARTNER',  
        'DOCTOR_VISITING', 'RECEPTIONIST', 'NURSE'),
      allowNull: false,
      defaultValue: 'CLINIC_ADMIN'
    },

    // The Granular Overrides
    custom_permissions: {
      type: DataTypes.JSON, // Use JSON type for flexibility
      allowNull: true,
      defaultValue: []
    },
    
    active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'clinic_admin',
    timestamps: true
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