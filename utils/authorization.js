const { ClinicDoctor, ClinicAdmin } = require('../models');

// Check if the user is a clinic admin or owner
exports.isClinicAdminOrOwner = async (userId, clinicId) => {
  const admin = await ClinicAdmin.findOne({
    where: { user_id: userId, clinic_id: clinicId, active: true },
  });
  return !!admin;
};

// Check if the user is a doctor for the given clinic
exports.isDoctorOfClinic = async (userId, clinicId) => {
  const doctor = await ClinicDoctor.findOne({
    where: { global_doctor_id: userId, clinic_id: clinicId, active: true },
  });
  return !!doctor;
};