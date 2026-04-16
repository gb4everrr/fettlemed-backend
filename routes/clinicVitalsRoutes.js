const express = require('express');
const router = express.Router();
const clinicVitalsController = require('../controllers/clinicVitalsController');
const doctorVitalAssignmentController = require('../controllers/doctorVitalAssignmentController');
const authenticate = require('../middleware/authenticate');
const clinicVitalTemplateController = require('../controllers/clinicVitalTemplateController');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// --- Global Catalog ---
// Read the global catalog (with already_added flags for this clinic)
router.get('/catalog', checkPermission('manage_vitals_entry'), clinicVitalsController.getVitalCatalog);
// Add a catalog item into the clinic's library
router.post('/catalog/add', checkPermission('manage_vitals_library'), clinicVitalsController.addCatalogItemToLibrary);

// --- Library ---
router.post('/library/create', checkPermission('manage_vitals_library'), clinicVitalsController.createVitalLibraryItem);
router.put('/library/update/:id', checkPermission('manage_vitals_library'), clinicVitalsController.updateVitalLibraryItem);
router.delete('/library/delete/:id', checkPermission('manage_vitals_library'), clinicVitalsController.deleteVitalLibraryItem);
router.get('/library/all', checkPermission('manage_vitals_entry'), clinicVitalsController.getClinicVitalLibrary);

// --- Assignments ---
router.post('/doctor-assignments/assign', checkPermission('manage_vitals_library'), doctorVitalAssignmentController.assignVitalsToDoctor);
router.get('/doctor-assignments/:clinic_doctor_id', checkPermission('view_own_schedule'), doctorVitalAssignmentController.getDoctorAssignedVitals);
router.get('/assignment-manager', checkPermission('view_vitals_settings'), doctorVitalAssignmentController.getLibraryWithDoctorAssignments);

// --- Entries ---
router.post('/entry/submit', checkPermission('manage_vitals_entry'), clinicVitalsController.submitPatientVitals);
router.get('/entry/history/:clinic_patient_id', checkPermission('view_patient_history'), clinicVitalsController.getPatientVitals);
router.get('/appointment/:appointment_id', checkPermission('view_patient_history'), clinicVitalsController.getVitalsForAppointment);
router.get('/patient/latest', checkPermission('view_patient_history'), clinicVitalsController.getLatestPatientVitals);

// --- Templates ---
router.get('/templates/all', checkPermission('view_vitals_settings'), clinicVitalTemplateController.getTemplates);
router.post('/templates/create', checkPermission('manage_templates'), clinicVitalTemplateController.createTemplate);
router.put('/templates/update/:id', checkPermission('manage_templates'), clinicVitalTemplateController.updateTemplate);
router.delete('/templates/delete/:id', checkPermission('manage_templates'), clinicVitalTemplateController.deleteTemplate);

module.exports = router;