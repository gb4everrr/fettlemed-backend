module.exports = (sequelize, DataTypes) => {
  return sequelize.define('DiagnosisCatalog', {
    name: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.STRING },
    snomed_code: { type: DataTypes.STRING },
    snomed_fsn: { type: DataTypes.TEXT },
    icd_code: { type: DataTypes.STRING },
    icd_description: { type: DataTypes.TEXT },
    body_system: { type: DataTypes.STRING },
    clinical_specialty: { type: DataTypes.STRING },
    search_aliases: { type: DataTypes.TEXT },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'diagnosis_catalog', timestamps: false });
};