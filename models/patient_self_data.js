module.exports = (sequelize, DataTypes) => {
  const PatientSelfData = sequelize.define('PatientSelfData', {
    // FK → patient_profile.id
    patient_profile_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    data_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // jsonb in DB — Sequelize JSON maps to jsonb on PostgreSQL
    data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // timestamp without time zone in DB
    entry_time: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'patient_self_data',
    timestamps: false
  });

  PatientSelfData.associate = (models) => {
    PatientSelfData.belongsTo(models.PatientProfile, {
      foreignKey: 'patient_profile_id',
      as: 'patientProfile'
    });
  };

  return PatientSelfData;
};