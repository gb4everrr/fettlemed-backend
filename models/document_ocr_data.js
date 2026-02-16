module.exports = (sequelize, DataTypes) => {
  const DocumentOcrData = sequelize.define('DocumentOcrData', {
    // FK → report_upload.id
    upload_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    processed_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // jsonb in DB — Sequelize JSON maps to jsonb on PostgreSQL
    parsed_json: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'document_ocr_data',
    timestamps: false
  });

  DocumentOcrData.associate = (models) => {
    DocumentOcrData.belongsTo(models.ReportUpload, {
      foreignKey: 'upload_id',
      as: 'reportUpload'
    });
  };

  return DocumentOcrData;
};