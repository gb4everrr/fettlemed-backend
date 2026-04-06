'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('phr_medications', {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      upload_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'report_upload', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      medication_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      dosage: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      frequency: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      duration: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      prescribed_by: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      prescribed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Index for the most common query pattern: fetch all meds for a patient
    await queryInterface.addIndex('phr_medications', ['patient_profile_id'], {
      name: 'idx_phr_medications_patient_profile_id',
    });

    // Index for looking up meds linked to a specific upload
    await queryInterface.addIndex('phr_medications', ['upload_id'], {
      name: 'idx_phr_medications_upload_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('phr_medications');
  },
};