module.exports = (sequelize, DataTypes) => {
  const PatientAllergy = sequelize.define('PatientAllergy', {
    clinic_patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false
      // references belong in the association definition, not here
    },
    allergy_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // DB stores as character varying — ENUM would cause CREATE TYPE failure
    severity: {
      type: DataTypes.STRING,
      defaultValue: 'unknown'
    },
    reaction: {
      type: DataTypes.STRING,
      allowNull: true
    },
    recorded_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'patient_allergies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['clinic_patient_id'] }
    ]
  });

  PatientAllergy.associate = (models) => {
    PatientAllergy.belongsTo(models.ClinicPatient, {
      foreignKey: 'clinic_patient_id',
      as: 'patient'
    });
  };

  return PatientAllergy;
};