module.exports = (sequelize, DataTypes) => {
  const Invoice =  sequelize.define('Invoice', {
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // CHANGED: Use clinic_patient_id as the foreign key
    clinic_patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clinic_patient', // Name of the target table
        key: 'id'                // Key in the target table
      }
    },
    invoice_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    total_amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  }, {
    tableName: 'invoice',
    timestamps: false
  });
  Invoice.associate = (models) => {

    Invoice.belongsTo(models.Clinic, {
      foreignKey: 'clinic_id',
      as: 'clinic'
    });
    
    Invoice.belongsTo(models.ClinicPatient, {
      foreignKey: 'clinic_patient_id',
      as: 'patient'
    });
    Invoice.hasMany(models.InvoiceService, {
      foreignKey: 'invoice_id',
      as: 'services'
    });
  };

  return Invoice;
};