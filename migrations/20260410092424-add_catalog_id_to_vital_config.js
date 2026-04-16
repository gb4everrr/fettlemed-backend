'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clinic_vital_config', 'catalog_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // NULL = custom vital created by clinic admin
      references: {
        model: 'global_vital_catalog',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // If a catalog entry is ever deactivated, clinic vitals are untouched
      comment: 'NULL = custom vital. Non-null = sourced from global catalog.',
    });

    await queryInterface.addIndex('clinic_vital_config', ['catalog_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('clinic_vital_config', 'catalog_id');
  },
};