'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('patient_profile', 'date_of_birth', {
      type: Sequelize.DATEONLY, // DATEONLY is sufficient, we don't need times
      allowNull: true,
    });
    await queryInterface.addColumn('patient_profile', 'gender', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('patient_profile', 'blood_type', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('patient_profile', 'date_of_birth');
    await queryInterface.removeColumn('patient_profile', 'gender');
    await queryInterface.removeColumn('patient_profile', 'blood_type');
  }
};