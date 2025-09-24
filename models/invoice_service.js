module.exports = (sequelize, DataTypes) => {
  // 1. Define the model and store it in a variable
  const InvoiceService = sequelize.define('InvoiceService', {
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    service_id: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    appointment_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'invoice_service',
    timestamps: false
  });

  // 2. Attach the associate method
  InvoiceService.associate = (models) => {
    InvoiceService.belongsTo(models.Invoice, {
      foreignKey: 'invoice_id',
      as: 'invoice'
    });
    InvoiceService.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service'
    });
    InvoiceService.belongsTo(models.Appointment, {
      foreignKey: 'appointment_id',
      as: 'appointment'
    });
  };

  // 3. Return the fully constructed model
  return InvoiceService;
};