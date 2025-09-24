'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('vitals_recorded_value', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      vital_entry_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      vital_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vital_value: {
        type: Sequelize.STRING,
        allowNull: false
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('vitals_recorded_value');
  }
};
