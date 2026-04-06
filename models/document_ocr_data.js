module.exports = (sequelize, DataTypes) => {
  const DocumentOcrData = sequelize.define('DocumentOcrData', {
    upload_id: { type: DataTypes.INTEGER, allowNull: true },
    processed_text: { type: DataTypes.TEXT, allowNull: true },
    parsed_json: { type: DataTypes.JSON, allowNull: true },
    flags: { type: DataTypes.JSON, allowNull: true } // NEW
  }, {
    tableName: 'document_ocr_data',
    timestamps: false
  });

  DocumentOcrData.associate = (models) => {
    DocumentOcrData.belongsTo(models.ReportUpload, { foreignKey: 'upload_id', as: 'reportUpload' });
  };

  return DocumentOcrData;
};