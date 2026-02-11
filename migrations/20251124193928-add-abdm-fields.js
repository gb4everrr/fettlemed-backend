'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Update PatientProfile (Identity & Address)
    await queryInterface.addColumn('patient_profile', 'abha_number', {
      type: Sequelize.STRING(14),
      allowNull: true,
      unique: true,
      comment: '14-digit ABHA Number for ABDM compliance'
    });
    
    await queryInterface.addColumn('patient_profile', 'abha_address', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'ABHA Alias (e.g., user@abdm)'
    });

    // 2. Update DoctorProfile (Professional Registry)
    await queryInterface.addColumn('doctor_profile', 'hpr_id', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'Healthcare Professional Registry ID (Doctor)'
    });

    // 3. Update Clinic (Facility Registry)
    await queryInterface.addColumn('clinic', 'hfr_id', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'Health Facility Registry ID (Clinic)'
    });

    // 4. Update Users (KYC Levels)
    await queryInterface.addColumn('users', 'kyc_level', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '0=Unverified, 1=Mobile/Email, 2=Aadhaar/ABHA Verified'
    });
  },

  async down(queryInterface, Sequelize) {
    // Rollback logic if needed
    await queryInterface.removeColumn('patient_profile', 'abha_number');
    await queryInterface.removeColumn('patient_profile', 'abha_address');
    await queryInterface.removeColumn('doctor_profile', 'hpr_id');
    await queryInterface.removeColumn('clinic', 'hfr_id');
    await queryInterface.removeColumn('users', 'kyc_level');
  }
};