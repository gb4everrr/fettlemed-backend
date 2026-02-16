module.exports = (sequelize, DataTypes) => {
  return sequelize.define('DrugCatalog', {
    name: { type: DataTypes.TEXT, allowNull: false },
    // DB column is character varying, not text — was incorrectly DataTypes.TEXT
    generic_name: { type: DataTypes.STRING, allowNull: true },
    strength: { type: DataTypes.STRING, allowNull: true },
    form: { type: DataTypes.STRING, allowNull: true },
    manufacturer: { type: DataTypes.STRING, allowNull: true },
    search_aliases: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'drug_catalog',
    timestamps: false
  });
};