module.exports = (sequelize, DataTypes) => {
  const GlobalVitalCatalog = sequelize.define('GlobalVitalCatalog', {
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    vital_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    data_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'number',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    min_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    max_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'global_vital_catalog',
    timestamps: false,
  });

  GlobalVitalCatalog.associate = (models) => {
    // Lets us trace which clinic vitals originated from a catalog entry
    GlobalVitalCatalog.hasMany(models.ClinicVitalConfig, {
      foreignKey: 'catalog_id',
      as: 'clinicVitals',
    });
  };

  return GlobalVitalCatalog;
};