'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add 'flags' column to document_ocr_data
    await queryInterface.addColumn('document_ocr_data', 'flags', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    // 2. Create phr_vitals table
    await queryInterface.createTable('phr_vitals', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      patient_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'patient_profile', // Ensure this matches your actual table name
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      upload_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'report_upload',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      vital_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vital_value: {
        type: Sequelize.STRING,
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: true
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for efficient time-series querying
    await queryInterface.addIndex('phr_vitals', ['patient_profile_id', 'vital_name', 'recorded_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('phr_vitals');
    await queryInterface.removeColumn('document_ocr_data', 'flags');
  }
};