'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('report_upload', 'file_hash', {
      type: Sequelize.STRING(64), // SHA-256 hex is always exactly 64 chars
      allowNull: true,            // Null on rows uploaded before this migration
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('report_upload', 'file_hash');
  },
};