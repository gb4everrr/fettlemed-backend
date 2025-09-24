'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
   await queryInterface.createTable('invoice', {
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
      invoice_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      total_amount: {
        type: Sequelize.FLOAT,
        allowNull: false
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('invoice');
  }
};
