const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authenticate = require('../middleware/authenticate');

router.post('/doctor/profile', profileController.createDoctorProfile);
router.post('/patient/profile', profileController.createPatientProfile);
router.post('/clinic-admin', profileController.createClinicAdmin);
router.get('/doctor', authenticate, profileController.getDoctorProfile);
router.put('/doctor', authenticate, profileController.updateDoctorProfile);

module.exports = router;