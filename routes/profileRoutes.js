const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

router.post('/doctor/profile', profileController.createDoctorProfile);
router.post('/patient/profile', profileController.createPatientProfile);
router.post('/clinic-admin', profileController.createClinicAdmin);

module.exports = router;