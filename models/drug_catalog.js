module.exports = (sequelize, DataTypes) => {
  return sequelize.define('DrugCatalog', {
    name: { type: DataTypes.TEXT, allowNull: false },
    generic_name: { type: DataTypes.TEXT },
    strength: { type: DataTypes.STRING },
    form: { type: DataTypes.STRING },
    manufacturer: { type: DataTypes.TEXT },
    search_aliases: { type: DataTypes.TEXT },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'drug_catalog', timestamps: false });
};