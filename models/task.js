module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('high', 'normal', 'low'),
      defaultValue: 'normal'
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'tasks',
    timestamps: true, // Automatically manages created_at / updated_at
    createdAt: 'created_at', // <--- FIX: Maps Sequelize's createdAt to DB's created_at
    updatedAt: 'updated_at', // <--- FIX: Maps Sequelize's updatedAt to DB's updated_at
    indexes: [
      {
        fields: ['user_id', 'is_completed']
      }
    ]
  });

  Task.associate = (models) => {
    Task.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Task;
};