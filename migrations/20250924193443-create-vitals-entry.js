'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('vitals_entry', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      clinic_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      clinic_patient_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      entry_date: {
        type: Sequelize.DATEONLY,
        defaultValue: Sequelize.NOW
      },
      entry_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      recorded_by_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('vitals_entry');
  }
};
