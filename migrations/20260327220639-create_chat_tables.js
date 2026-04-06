'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── chat_threads ──────────────────────────────────────────────────────────
    // One row per logical conversation.
    // global thread:   unique per patient (thread_type='global', upload_id=null)
    // document thread: unique per upload  (thread_type='document', upload_id=N)
    await queryInterface.createTable('chat_threads', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      patient_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'patient_profile', key: 'id' },
        onDelete: 'CASCADE',
      },
      thread_type: {
        type: Sequelize.ENUM('global', 'document'),
        allowNull: false,
      },
      upload_id: {
        // Null for global threads. FK to report_uploads for document threads.
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'report_upload', key: 'id' },
        onDelete: 'CASCADE',
      },
      // Rolling summary of messages that have been pruned from chat_messages.
      // Null until the first summarisation threshold is crossed.
      // On subsequent crossings, the new summary is merged into this field.
      summary: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // One global thread per patient
    await queryInterface.addIndex('chat_threads', {
      fields: ['patient_profile_id', 'thread_type'],
      unique: true,
      where: { thread_type: 'global' }, // partial index — only enforced for global rows
      name: 'chat_threads_global_unique',
    });

    // One document thread per upload
    await queryInterface.addIndex('chat_threads', {
      fields: ['upload_id'],
      unique: true,
      where: { thread_type: 'document' },
      name: 'chat_threads_document_unique',
    });

    // Fast lookup: all threads for a patient
    await queryInterface.addIndex('chat_threads', {
      fields: ['patient_profile_id'],
      name: 'chat_threads_patient_idx',
    });

    // ── chat_messages ─────────────────────────────────────────────────────────
    // Individual turns. Oldest messages are pruned after summarisation.
    await queryInterface.createTable('chat_messages', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      thread_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'chat_threads', key: 'id' },
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM('user', 'assistant'),
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      // No updated_at — messages are immutable once written.
    });

    // Primary access pattern: all messages for a thread, chronological
    await queryInterface.addIndex('chat_messages', {
      fields: ['thread_id', 'created_at'],
      name: 'chat_messages_thread_time_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('chat_messages');
    await queryInterface.dropTable('chat_threads');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_chat_threads_thread_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_chat_messages_role";');
  },
};