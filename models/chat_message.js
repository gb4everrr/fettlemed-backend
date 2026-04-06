'use strict';

// models/ChatMessage.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ChatMessage extends Model {
    static associate(models) {
      ChatMessage.belongsTo(models.ChatThread, { foreignKey: 'thread_id', as: 'thread' });
    }
  }

  ChatMessage.init(
    {
      id:        { type: DataTypes.INTEGER,              primaryKey: true, autoIncrement: true },
      thread_id: { type: DataTypes.INTEGER,              allowNull: false },
      role:      { type: DataTypes.ENUM('user', 'assistant'), allowNull: false },
      content:   { type: DataTypes.TEXT,                 allowNull: false },
    },
    {
      sequelize,
      modelName: 'ChatMessage',
      tableName: 'chat_messages',
      underscored: true,
      updatedAt: false, // messages are immutable
    }
  );

  return ChatMessage;
};