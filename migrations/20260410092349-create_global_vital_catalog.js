'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('global_vital_catalog', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'e.g. Anthropometrics, Hemodynamics, Respiratory',
      },
      vital_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Concatenated name, e.g. "Blood Pressure (Systolic)"',
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      data_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'number',
        comment: 'number, text, boolean, date',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Helper text shown as tooltip in UI',
      },
      min_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Optional validation lower bound',
      },
      max_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Optional validation upper bound',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    });

    // Index for fast category-grouped lookups in the UI
    await queryInterface.addIndex('global_vital_catalog', ['category']);
    // Index for duplicate detection queries
    await queryInterface.addIndex('global_vital_catalog', ['vital_name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('global_vital_catalog');
  },
};