module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Service', {
    service_name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'service',
    timestamps: false
  });
};