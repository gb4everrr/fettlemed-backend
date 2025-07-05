module.exports = (sequelize, DataTypes) => {
  const ClinicAdmin = sequelize.define('ClinicAdmin', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'clinic_admin',
    timestamps: false
  });

  return ClinicAdmin;
};
