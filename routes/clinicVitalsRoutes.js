const express = require('express');
const router = express.Router();
const clinicVitalsController = require('../controllers/clinicVitalsController');
const doctorVitalAssignmentController = require('../controllers/doctorVitalAssignmentController');
const authenticate = require('../middleware/authenticate');
const clinicVitalTemplateController = require('../controllers/clinicVitalTemplateController');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// --- Library & Templates ---
router.post('/library/create', checkPermission('manage_vitals_library'), clinicVitalsController.createVitalLibraryItem);
router.put('/library/update/:id', checkPermission('manage_vitals_library'), clinicVitalsController.updateVitalLibraryItem);
router.delete('/library/delete/:id', checkPermission('manage_vitals_library'), clinicVitalsController.deleteVitalLibraryItem);
router.get('/library/all', checkPermission('manage_vitals_entry'), clinicVitalsController.getClinicVitalLibrary); 

// --- Assignments ---
// FIX: Changed from 'manage_staff' to 'manage_vitals_library'
// This allows Doctor Owners/Partners to access this route
router.post('/doctor-assignments/assign', checkPermission('manage_vitals_library'), doctorVitalAssignmentController.assignVitalsToDoctor);

// Read Access
router.get('/doctor-assignments/:clinic_doctor_id', checkPermission('view_own_schedule'), doctorVitalAssignmentController.getDoctorAssignedVitals);

// FIX: Changed from 'manage_staff' to 'view_vitals_settings' or 'manage_vitals_library'
// 'view_vitals_settings' allows Visiting doctors to see the list. 'manage_vitals_library' allows editing.
router.get('/assignment-manager', checkPermission('view_vitals_settings'), doctorVitalAssignmentController.getLibraryWithDoctorAssignments);

// --- Entries ---
router.post('/entry/submit', checkPermission('manage_vitals_entry'), clinicVitalsController.submitPatientVitals);
router.get('/entry/history/:clinic_patient_id', checkPermission('view_patient_history'), clinicVitalsController.getPatientVitals);
router.get('/appointment/:appointment_id', checkPermission('view_patient_history'), clinicVitalsController.getVitalsForAppointment);

// --- Templates ---
router.get('/templates/all', checkPermission('view_vitals_settings'), clinicVitalTemplateController.getTemplates);
router.post('/templates/create', checkPermission('manage_templates'), clinicVitalTemplateController.createTemplate);
router.put('/templates/update/:id', checkPermission('manage_templates'), clinicVitalTemplateController.updateTemplate);
router.delete('/templates/delete/:id', checkPermission('manage_templates'), clinicVitalTemplateController.deleteTemplate);

module.exports = router;