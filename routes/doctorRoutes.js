const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// --- GLOBAL ROUTES (No Clinic Context = No RBAC Check) ---
// --- GLOBAL VIEWS (No Clinic ID required) ---
// These aggregate data across all clinics, so they cannot use checkPermission (which needs specific clinic_id)
router.get('/dashboard-stats', doctorController.getDashboardStats);
router.get('/appointments', doctorController.getDoctorAppointments);
router.get('/my-clinics', doctorController.getAssociatedClinics);
router.get('/my-clinics-details', doctorController.getAssociatedClinicsDetails);
router.get('/my-appointments-details', doctorController.getDetailedAppointments);
router.get('/my-patients-details', doctorController.getDoctorPatientsDetails);
router.get('/my-invoices', doctorController.getDoctorInvoices);
router.get('/unified-availability', doctorController.getUnifiedAvailability);
router.get('/calendar-data', doctorController.getDoctorCalendarData);
router.get('/invoice/:id', doctorController.getDoctorInvoiceDetails);
// --Task Management
router.get('/tasks', doctorController.getDoctorTasks);
router.post('/tasks', doctorController.createTask);
router.put('/tasks/:id', doctorController.updateTask);
router.delete('/tasks/:id', doctorController.deleteTask);

// --- PROFILE MANAGEMENT ---
router.get('/profile', doctorController.getDoctorProfile);
router.put('/profile', doctorController.updateDoctorProfile);

// --- CLINIC-SPECIFIC ACTIONS (Clinic ID IS required) ---
// These affect a specific clinic, so we CAN enforce permissions here if the frontend sends clinic_id
router.post('/availability', 
  checkPermission('manage_availability'), 
  doctorController.createAvailability
);

router.get('/availability', 
  checkPermission('view_own_schedule'), 
  doctorController.getAvailability
);

router.post('/availability-exception', 
  checkPermission('manage_availability'), 
  doctorController.createAvailabilityException
);

// --- SPECIFIC RESOURCES ---
// Note: Frontend must pass ?clinic_id=X for this to pass RBAC, 
// OR you can remove checkPermission if you rely on the controller's ownership check.
router.get('/patient-details/:patientId', 
  // checkPermission('view_patient_history'), // Optional: Remove if causing issues fetching global patient view
  doctorController.getPatientDetailsForDoctor
);

// For consultation notes, the controller checks ownership of the appointment.
// RBAC is optional here depending on if your UI sends clinic_id.
router.put('/consultation-note/:appointmentId', 
  doctorController.addOrUpdateConsultationNote
);

// --- ALLERGY ROUTES ---
router.get('/patient/:patientId/allergies', 
    checkPermission('view_patient_history'), 
    doctorController.getPatientAllergies
);

router.post('/patient/:patientId/allergies', 
    checkPermission('manage_medical_records'), 
    doctorController.addPatientAllergy
);

router.delete('/allergies/:id', 
    checkPermission('manage_medical_records'), 
    doctorController.deletePatientAllergy
);

module.exports = router;