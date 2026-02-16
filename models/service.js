module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    // DB is_nullable: YES for both — were incorrectly allowNull: false
    name: { type: DataTypes.STRING, allowNull: true },
    price: { type: DataTypes.FLOAT, allowNull: true },
    clinic_id: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'service',
    timestamps: false
  });

  Service.associate = (models) => {
    Service.belongsTo(models.Clinic, {
      foreignKey: 'clinic_id',
      as: 'clinic'
    });
  };

  return Service;
};