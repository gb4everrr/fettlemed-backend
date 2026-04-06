module.exports = (sequelize, DataTypes) => {
  const PhrEncounter = sequelize.define('PhrEncounter', {
    patient_profile_id: { type: DataTypes.INTEGER, allowNull: false },
    upload_id:          { type: DataTypes.INTEGER, allowNull: true  },
    admission_date:     { type: DataTypes.DATEONLY, allowNull: true  },
    discharge_date:     { type: DataTypes.DATEONLY, allowNull: true  },
    reason_for_visit:   { type: DataTypes.TEXT,    allowNull: true  },
    followup_instructions: { type: DataTypes.TEXT, allowNull: true  },
    attending_doctor:   { type: DataTypes.STRING,  allowNull: true  },
  }, {
    tableName: 'phr_encounters',
    timestamps: true, // camelCase createdAt/updatedAt — consistent with phr_vitals/phr_medications
  });

  PhrEncounter.associate = (models) => {
    PhrEncounter.belongsTo(models.PatientProfile, {
      foreignKey: 'patient_profile_id',
      as: 'patient',
    });
    PhrEncounter.belongsTo(models.ReportUpload, {
      foreignKey: 'upload_id',
      as: 'sourceDocument',
    });
  };

  return PhrEncounter;
};