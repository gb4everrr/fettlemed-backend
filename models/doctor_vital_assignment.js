module.exports = (sequelize, DataTypes) => {
  const DoctorVitalAssignment = sequelize.define('DoctorVitalAssignment', {
    clinic_doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    vital_config_id: { type: DataTypes.INTEGER, allowNull: false }, // References clinic_vital_config
    is_required: { type: DataTypes.BOOLEAN, defaultValue: false },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'doctor_vital_assignment',
    timestamps: true,
    createdAt: 'assigned_at',
    updatedAt: false
  });

  DoctorVitalAssignment.associate = (models) => {
    DoctorVitalAssignment.belongsTo(models.ClinicDoctor, {
      foreignKey: 'clinic_doctor_id',
      as: 'doctor'
    });
    DoctorVitalAssignment.belongsTo(models.ClinicVitalConfig, {
      foreignKey: 'vital_config_id',
      as: 'vitalConfig'
    });
  };

  return DoctorVitalAssignment;
};