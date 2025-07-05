module.exports = (sequelize, DataTypes) => {
  return sequelize.define('InvoiceService', {
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    service_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    subtotal: { type: DataTypes.FLOAT, allowNull: false }
  }, {
    tableName: 'invoice_service',
    timestamps: false
  });
};
