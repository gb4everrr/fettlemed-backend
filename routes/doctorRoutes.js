const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const authenticate = require('../middleware/authenticate');

// All doctor routes should be protected
router.use(authenticate);

router.get('/appointments', authenticate, doctorController.getDoctorAppointments);
router.get('/my-clinics', doctorController.getAssociatedClinics);
router.post('/availability', doctorController.createAvailability);
router.get('/availability', doctorController.getAvailability);
router.post('/availability-exception', doctorController.createAvailabilityException);
router.get('/dashboard-stats', doctorController.getDashboardStats);
router.get('/unified-availability', doctorController.getUnifiedAvailability);
router.get('/my-clinics-details', doctorController.getAssociatedClinicsDetails);
router.get('/my-appointments-details', doctorController.getDetailedAppointments);
router.get('/my-patients-details', doctorController.getDoctorPatientsDetails);
router.get('/my-invoices', doctorController.getDoctorInvoices);
router.get('/profile', doctorController.getDoctorProfile);
router.put('/profile', doctorController.updateDoctorProfile);
router.get('/calendar-data', doctorController.getDoctorCalendarData);
router.get('/patient-details/:patientId', doctorController.getPatientDetailsForDoctor);
router.put('/consultation-note/:appointmentId', doctorController.addOrUpdateConsultationNote);





module.exports = router;