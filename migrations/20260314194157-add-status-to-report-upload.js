'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('report_upload', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'PENDING',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // This allows you to "undo" the migration if needed
    await queryInterface.removeColumn('report_upload', 'status');
  }
};