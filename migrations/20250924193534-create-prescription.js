'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('prescription', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      patient_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      doctor_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      symptoms: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      provisional_diagnosis: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      investigations: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      clinical_summary: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      final_diagnosis: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      prescription: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      original_copy: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('prescription');
  }
};
