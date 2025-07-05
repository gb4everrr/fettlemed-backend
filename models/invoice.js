module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Invoice', {
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    invoice_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    total_amount: { type: DataTypes.FLOAT, allowNull: false }
  }, {
    tableName: 'invoice',
    timestamps: false
  });
};