module.exports = (sequelize, DataTypes) => {
  const VitalsRecordedValue = sequelize.define('VitalsRecordedValue', {
    // FIX: Corrected column name to match the database
    vital_entry_id: { type: DataTypes.INTEGER, allowNull: false },
    // FIX: Using the correct 'vital_name' column instead of the non-existent 'config_id'
    vital_name: { type: DataTypes.STRING, allowNull: false },
    vital_value: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'vitals_recorded_value',
    timestamps: false,
    
    defaultScope: {
      attributes: ['id', 'vital_entry_id', 'vital_name', 'vital_value']
    }
  });

  VitalsRecordedValue.associate = (models) => {
    // Defines the relationship back to the main entry using the correct foreign key
    VitalsRecordedValue.belongsTo(models.VitalsEntry, {
      foreignKey: 'vital_entry_id',
      as: 'entry'
    });
   
  };

  return VitalsRecordedValue;
};

