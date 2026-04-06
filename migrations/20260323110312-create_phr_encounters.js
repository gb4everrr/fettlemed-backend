'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('phr_encounters', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      patient_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'patient_profile', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      upload_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'report_upload', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      admission_date:        { type: Sequelize.DATEONLY, allowNull: true },
      discharge_date:        { type: Sequelize.DATEONLY, allowNull: true },
      reason_for_visit:      { type: Sequelize.TEXT,    allowNull: true },
      followup_instructions: { type: Sequelize.TEXT,    allowNull: true },
      attending_doctor:      { type: Sequelize.STRING,  allowNull: true },
      // camelCase timestamps — consistent with phr_vitals and phr_medications
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('phr_encounters', ['patient_profile_id']);
    await queryInterface.addIndex('phr_encounters', ['upload_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('phr_encounters');
  },
};