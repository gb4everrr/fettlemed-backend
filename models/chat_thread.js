'use strict';

// models/ChatThread.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ChatThread extends Model {
    static associate(models) {
      ChatThread.belongsTo(models.User,         { foreignKey: 'user_id',   as: 'user'     });
      ChatThread.belongsTo(models.ReportUpload, { foreignKey: 'upload_id', as: 'upload'   });
      ChatThread.hasMany(models.ChatMessage,    { foreignKey: 'thread_id', as: 'messages' });
    }
  }

  ChatThread.init(
    {
      id:          { type: DataTypes.INTEGER,                    primaryKey: true, autoIncrement: true },
      user_id:     { type: DataTypes.INTEGER,                    allowNull: false },  // FK → users.id
      thread_type: { type: DataTypes.ENUM('global', 'document'), allowNull: false },
      upload_id:   { type: DataTypes.INTEGER,                    allowNull: true  },
      summary:     { type: DataTypes.TEXT,                       allowNull: true  },
    },
    {
      sequelize,
      modelName: 'ChatThread',
      tableName: 'chat_threads',
      underscored: true,
    }
  );

  return ChatThread;
};