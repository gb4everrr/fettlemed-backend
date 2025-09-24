const express = require('express');
const router = express.Router();
const clinicVitalsController = require('../controllers/clinicVitalsController');
const doctorVitalAssignmentController = require('../controllers/doctorVitalAssignmentController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);


router.post('/library/create', clinicVitalsController.createVitalLibraryItem);
router.put('/library/update/:id', clinicVitalsController.updateVitalLibraryItem);
router.delete('/library/delete/:id', clinicVitalsController.deleteVitalLibraryItem);
router.get('/library/all', clinicVitalsController.getClinicVitalLibrary);

router.post('/doctor-assignments/assign', doctorVitalAssignmentController.assignVitalsToDoctor);
router.get('/doctor-assignments/:clinic_doctor_id', doctorVitalAssignmentController.getDoctorAssignedVitals);
router.get('/assignment-manager', doctorVitalAssignmentController.getLibraryWithDoctorAssignments);


router.post('/entry/submit', clinicVitalsController.submitPatientVitals);
router.get('/entry/history/:clinic_patient_id', clinicVitalsController.getPatientVitals);
router.get('/appointment/:appointment_id', clinicVitalsController.getVitalsForAppointment);

module.exports = router;