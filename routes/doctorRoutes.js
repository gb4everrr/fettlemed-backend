const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// --- GLOBAL ROUTES (No Clinic Context = No RBAC Check) ---
// These rely solely on 'authenticate' because they list data across *all* clinics
router.get('/my-clinics', doctorController.getAssociatedClinics);
router.get('/my-clinics-details', doctorController.getAssociatedClinicsDetails);
router.get('/profile', doctorController.getDoctorProfile);
router.put('/profile', doctorController.updateDoctorProfile);

// --- CLINIC CONTEXT ROUTES (Requires clinic_id in body/query) ---

// Availability Management
router.post('/availability', checkPermission('manage_availability'), doctorController.createAvailability);
router.get('/availability', checkPermission('view_own_schedule'), doctorController.getAvailability);
router.post('/availability-exception', checkPermission('manage_availability'), doctorController.createAvailabilityException);
router.get('/unified-availability', checkPermission('view_own_schedule'), doctorController.getUnifiedAvailability);

// Clinical Data
router.get('/appointments', checkPermission('view_own_schedule'), doctorController.getDoctorAppointments);
router.get('/my-appointments-details', checkPermission('view_own_schedule'), doctorController.getDetailedAppointments);
router.get('/my-patients-details', checkPermission('view_assigned_patients'), doctorController.getDoctorPatientsDetails);
router.get('/patient-details/:patientId', checkPermission('view_patient_history'), doctorController.getPatientDetailsForDoctor);
router.put('/consultation-note/:appointmentId', checkPermission('manage_medical_records'), doctorController.addOrUpdateConsultationNote);

// Dashboard/Financials
router.get('/dashboard-stats', checkPermission('view_analytics_doc'), doctorController.getDashboardStats);
router.get('/my-invoices', checkPermission('view_analytics_doc'), doctorController.getDoctorInvoices);
router.get('/calendar-data', checkPermission('view_own_schedule'), doctorController.getDoctorCalendarData);

module.exports = router;