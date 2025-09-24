'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
   await queryInterface.createTable('appointment', {
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
      clinic_doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      slot_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      datetime_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      datetime_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      invoice_no: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('appointment');
  }
};
