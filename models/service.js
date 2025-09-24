module.exports = (sequelize, DataTypes) => {
  // 1. Define the model
  const Service = sequelize.define('Service', {
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'service',
    timestamps: false
  });

  // 2. Add the associate method
  Service.associate = (models) => {
    Service.belongsTo(models.Clinic, {
      foreignKey: 'clinic_id',
      as: 'clinic'
    });
  };

  // 3. Return the model
  return Service;
};
