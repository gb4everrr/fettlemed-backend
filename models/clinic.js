// gb4everrr/fettlemed-backend/models/clinic.js
module.exports = (sequelize, DataTypes) => {
  const Clinic = sequelize.define('Clinic', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true // Added unique constraint for email if not already in migration
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UTC', 
      comment: 'IANA timezone name, e.g., "Asia/Kolkata" or "America/New_York"'
    }
  }, {
    tableName: 'clinic',
    freezeTableName: true,
    timestamps: true
  });

  // ADDED: Association definition
  Clinic.associate = (models) => {
    Clinic.hasMany(models.ClinicAdmin, {
      foreignKey: 'clinic_id', // foreign key in ClinicAdmin model
      as: 'clinicAdmins',     // alias for eager loading
      onDelete: 'CASCADE',    // if clinic is deleted, delete associated clinic_admin entries
    });
    Clinic.hasMany(models.Appointment, {
      foreignKey: 'clinic_id',
      as: 'appointments'
    });
    Clinic.hasMany(models.Invoice, {
      foreignKey: 'clinic_id',
      as: 'invoices'
    });
    
  };

  return Clinic;
};