'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('phr_imaging_reports', {
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
      modality:    { type: Sequelize.STRING,   allowNull: true }, // MRI | CT | X-Ray | Ultrasound | PET
      body_part:   { type: Sequelize.STRING,   allowNull: true },
      impression:  { type: Sequelize.TEXT,     allowNull: true },
      findings:    { type: Sequelize.TEXT,     allowNull: true },
      reported_by: { type: Sequelize.STRING,   allowNull: true },
      report_date: { type: Sequelize.DATEONLY, allowNull: true },
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

    await queryInterface.addIndex('phr_imaging_reports', ['patient_profile_id']);
    await queryInterface.addIndex('phr_imaging_reports', ['upload_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('phr_imaging_reports');
  },
};