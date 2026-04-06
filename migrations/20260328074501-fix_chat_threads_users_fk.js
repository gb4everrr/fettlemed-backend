'use strict';

/**
 * Adds user_id column to chat_threads.
 *
 * The original migration failed before adding any identity column, so the
 * table currently has: id, thread_type, upload_id, summary, timestamps.
 * This migration adds user_id → users.id (the correct identity for chat ownership).
 *
 * Identity map (confirmed):
 *   users.id → clinic_patient.global_patient_id   (clinic fan-out)
 *   users.id → patient_profile.user_id → patient_profile.id → phr_*.patient_profile_id
 *   users.id → chat_threads.user_id               (chat ownership — this migration)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add user_id column
    await queryInterface.addColumn('chat_threads', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    });

    // 2. Unique partial index: one global thread per user
    await queryInterface.addIndex('chat_threads', {
      fields: ['user_id', 'thread_type'],
      unique: true,
      where: { thread_type: 'global' },
      name: 'chat_threads_global_unique',
    });

    // 3. Lookup index: all threads for a user
    await queryInterface.addIndex('chat_threads', {
      fields: ['user_id'],
      name: 'chat_threads_user_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('chat_threads', 'chat_threads_global_unique');
    await queryInterface.removeIndex('chat_threads', 'chat_threads_user_idx');
    await queryInterface.removeColumn('chat_threads', 'user_id');
  },
};