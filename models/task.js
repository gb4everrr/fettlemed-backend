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
    // DB stores as character varying — ENUM would cause CREATE TYPE failure
    priority: {
      type: DataTypes.STRING,
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
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id', 'is_completed'] }
    ]
  });

  Task.associate = (models) => {
    Task.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Task;
};