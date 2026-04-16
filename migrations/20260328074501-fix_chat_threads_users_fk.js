'use strict';

/**
 * Safe migration:
 * - Adds user_id only if it does not exist
 * - Adds indexes only if they do not already exist
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('chat_threads');

    // 1. Add user_id column only if missing
    if (!table.user_id) {
      await queryInterface.addColumn('chat_threads', 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      });
    }

    // Helper to check existing indexes
    const indexes = await queryInterface.showIndex('chat_threads');
    const indexNames = indexes.map(i => i.name);

    // 2. Add unique global index if not exists
    if (!indexNames.includes('chat_threads_global_unique_user')) {
      await queryInterface.addIndex('chat_threads', {
        fields: ['user_id', 'thread_type'],
        unique: true,
        where: { thread_type: 'global' },
        name: 'chat_threads_global_unique_user', // renamed to avoid clash
      });
    }

    // 3. Add lookup index if not exists
    if (!indexNames.includes('chat_threads_user_idx')) {
      await queryInterface.addIndex('chat_threads', {
        fields: ['user_id'],
        name: 'chat_threads_user_idx',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('chat_threads');
    const indexNames = indexes.map(i => i.name);

    // Remove indexes only if they exist
    if (indexNames.includes('chat_threads_global_unique_user')) {
      await queryInterface.removeIndex('chat_threads', 'chat_threads_global_unique_user');
    }

    if (indexNames.includes('chat_threads_user_idx')) {
      await queryInterface.removeIndex('chat_threads', 'chat_threads_user_idx');
    }

    const table = await queryInterface.describeTable('chat_threads');

    // Remove column only if it exists
    if (table.user_id) {
      await queryInterface.removeColumn('chat_threads', 'user_id');
    }
  },
};