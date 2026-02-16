module.exports = (sequelize, DataTypes) => {
  const ClinicAdmin = sequelize.define('ClinicAdmin', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },

    // DB stores this as a USER-DEFINED PG ENUM (not a Sequelize-managed ENUM).
    // Using DataTypes.ENUM here would make the migration generator attempt a
    // CREATE TYPE which already exists and will fail. Use STRING to match the
    // underlying varchar storage that Sequelize sees when reading the column.
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'CLINIC_ADMIN'
    },

    custom_permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },

    active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'clinic_admin',
    // DB columns are camelCase (createdAt / updatedAt) — Sequelize default matches
    timestamps: true
  });

  ClinicAdmin.associate = (models) => {
    ClinicAdmin.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    ClinicAdmin.belongsTo(models.Clinic, {
      foreignKey: 'clinic_id',
      as: 'clinic'
    });
  };

  return ClinicAdmin;
};