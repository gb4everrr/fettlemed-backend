module.exports = (sequelize, DataTypes) => {
const LabCatalog = sequelize.define('LabCatalog', {
    test_name: { type: DataTypes.TEXT, allowNull: false }, // Changed to TEXT
    test_code: { type: DataTypes.STRING },
    search_aliases: { type: DataTypes.TEXT },
    category: { type: DataTypes.STRING },
    unit: { type: DataTypes.STRING },
    reference_range: { type: DataTypes.TEXT }, // Changed to TEXT
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { 
    tableName: 'lab_catalog', 
    timestamps: false 
});

  LabCatalog.associate = (models) => {
    LabCatalog.hasMany(models.LabOrder, { foreignKey: 'lab_catalog_id', as: 'orders' });
  };

  return LabCatalog;
};