module.exports = (sequelize, DataTypes) => {
  const ClinicVitalConfig = sequelize.define('ClinicVitalConfig', {
    clinic_id:   { type: DataTypes.INTEGER, allowNull: false },
    vital_name:  { type: DataTypes.STRING,  allowNull: false },
    data_type:   { type: DataTypes.STRING },
    unit:        { type: DataTypes.STRING },
    is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
    is_required: { type: DataTypes.BOOLEAN, defaultValue: false },

    // NULL  → custom vital created by the clinic admin
    // Non-null → sourced from global_vital_catalog
    catalog_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'global_vital_catalog', key: 'id' },
    },
  }, {
    tableName: 'clinic_vital_config',
    timestamps: false,
  });

  ClinicVitalConfig.associate = (models) => {
    ClinicVitalConfig.hasMany(models.DoctorVitalAssignment, {
      foreignKey: 'vital_config_id',
      as: 'assignments',
    });
    ClinicVitalConfig.hasMany(models.VitalsRecordedValue, {
      foreignKey: 'config_id',
      as: 'recordedValues',
    });
    // NEW: back-reference to the catalog entry it came from (if any)
    ClinicVitalConfig.belongsTo(models.GlobalVitalCatalog, {
      foreignKey: 'catalog_id',
      as: 'catalogEntry',
    });
  };

  return ClinicVitalConfig;
};