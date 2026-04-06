module.exports = (sequelize, DataTypes) => {
  const Clinic = sequelize.define('Clinic', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // DB column is text (not varchar) and is nullable in DB
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Nullable in DB (is_nullable: YES) — relaxed from old model's allowNull: false
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    // Nullable in DB (is_nullable: YES) — relaxed from old model's allowNull: false
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Asia/Kolkata',
      comment: 'IANA timezone name, e.g., "Asia/Kolkata"'
    },
    brandColor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#2D5367',
      field: 'brand_color'
    },
    parent_clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'clinic',
        key: 'id'
      }
    },
    // ABDM Field: Health Facility Registry ID
    hfr_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    }
  }, {
    tableName: 'clinic',
    freezeTableName: true,
    // DB has createdAt / updatedAt (camelCase) — Sequelize default matches
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  Clinic.associate = (models) => {
    Clinic.hasMany(models.ClinicAdmin, {
      foreignKey: 'clinic_id',
      as: 'clinicAdmins',
      onDelete: 'CASCADE',
    });
    Clinic.hasMany(models.Appointment, {
      foreignKey: 'clinic_id',
      as: 'appointments'
    });
    Clinic.hasMany(models.Invoice, {
      foreignKey: 'clinic_id',
      as: 'invoices'
    });
    Clinic.hasMany(models.Clinic, {
      foreignKey: 'parent_clinic_id',
      as: 'branches'
    });
    Clinic.belongsTo(models.Clinic, {
      foreignKey: 'parent_clinic_id',
      as: 'parentClinic'
    });
  };

  return Clinic;
};