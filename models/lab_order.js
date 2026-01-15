module.exports = (sequelize, DataTypes) => {
  const LabOrder = sequelize.define('LabOrder', {
    clinic_id: { type: DataTypes.INTEGER, allowNull: false },
    clinic_patient_id: { type: DataTypes.INTEGER, allowNull: false },
    appointment_id: { type: DataTypes.INTEGER, allowNull: true },
    ordered_by_doctor_id: { type: DataTypes.INTEGER }, 
    lab_catalog_id: { type: DataTypes.INTEGER, allowNull: true },
    test_name: { type: DataTypes.STRING, allowNull: false },
    status: { 
      type: DataTypes.ENUM('Ordered', 'Collected', 'Completed', 'Cancelled'), 
      defaultValue: 'Ordered' 
    },
    priority: { 
      type: DataTypes.ENUM('routine', 'stat', 'urgent'), 
      defaultValue: 'routine' 
    },
    notes: { type: DataTypes.TEXT },
    result_value: { type: DataTypes.TEXT }, 
    ordered_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'lab_order',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  LabOrder.associate = (models) => {
    LabOrder.belongsTo(models.Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
    LabOrder.belongsTo(models.ClinicPatient, { foreignKey: 'clinic_patient_id', as: 'patient' });
    LabOrder.belongsTo(models.Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
    LabOrder.belongsTo(models.LabCatalog, { foreignKey: 'lab_catalog_id', as: 'catalog_item' });
    // ADDED: To correctly identify the ordering doctor
    LabOrder.belongsTo(models.ClinicDoctor, { foreignKey: 'ordered_by_doctor_id', as: 'doctor' });
  };

  return LabOrder;
};