const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const patientController = require('../controllers/patientController');

router.use(authenticate);
router.get('/doctors', patientController.getDoctorsWithClinics);
router.get('/clinics', patientController.getClinics);

router.get('/appointments/available-slots', patientController.getAvailableSlots);
router.post('/appointments/book', patientController.bookAppointment);
router.get('/appointments/my', patientController.getMyAppointments);
router.patch('/appointments/:id/reschedule', patientController.rescheduleAppointment);

// Self data routes
router.post('/self-data', patientController.createSelfData);
router.get('/self-data', patientController.getSelfData);
router.put('/self-data/:id', patientController.updateSelfData);
router.delete('/self-data/:id', patientController.deleteSelfData);

// Clinic vitals view
router.get('/clinic-vitals', patientController.getClinicVitals);

// Prescriptions view
router.get('/prescriptions', patientController.getMyPrescriptions);

module.exports = router;