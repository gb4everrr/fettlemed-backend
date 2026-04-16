'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('consultation_note', 'provisional_diagnosis', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'objective' // Places it after 'objective' in MySQL; ignored in Postgres
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('consultation_note', 'provisional_diagnosis');
  }
};