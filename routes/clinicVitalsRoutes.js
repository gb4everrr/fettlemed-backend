const express = require('express');
const router = express.Router();
const clinicVitalsController = require('../controllers/clinicVitalsController');
const doctorVitalAssignmentController = require('../controllers/doctorVitalAssignmentController');
const authenticate = require('../middleware/authenticate');
const clinicVitalTemplateController = require('../controllers/clinicVitalTemplateController');

const { checkPermission } = require('../middleware/rbacMiddleWare');


router.use(authenticate);

// Library & Templates (Admin setup)
router.post('/library/create', checkPermission('manage_vitals_library'), clinicVitalsController.createVitalLibraryItem);
router.put('/library/update/:id', checkPermission('manage_vitals_library'), clinicVitalsController.updateVitalLibraryItem);
router.delete('/library/delete/:id', checkPermission('manage_vitals_library'), clinicVitalsController.deleteVitalLibraryItem);
router.get('/library/all', checkPermission('manage_vitals_entry'), clinicVitalsController.getClinicVitalLibrary); // Nurses need to see it to use it

// Assignments
router.post('/doctor-assignments/assign', checkPermission('manage_staff'), doctorVitalAssignmentController.assignVitalsToDoctor);
router.get('/doctor-assignments/:clinic_doctor_id', checkPermission('view_own_schedule'), doctorVitalAssignmentController.getDoctorAssignedVitals);
router.get('/assignment-manager', checkPermission('manage_staff'), doctorVitalAssignmentController.getLibraryWithDoctorAssignments);

// Entries (Nurses/Doctors)
router.post('/entry/submit', checkPermission('manage_vitals_entry'), clinicVitalsController.submitPatientVitals);
router.get('/entry/history/:clinic_patient_id', checkPermission('view_patient_history'), clinicVitalsController.getPatientVitals);
router.get('/appointment/:appointment_id', checkPermission('view_patient_history'), clinicVitalsController.getVitalsForAppointment);

// Templates
router.get('/templates/all', checkPermission('manage_templates'), clinicVitalTemplateController.getTemplates);
router.post('/templates/create', checkPermission('manage_templates'), clinicVitalTemplateController.createTemplate);
router.put('/templates/update/:id', checkPermission('manage_templates'), clinicVitalTemplateController.updateTemplate);
router.delete('/templates/delete/:id', checkPermission('manage_templates'), clinicVitalTemplateController.deleteTemplate);

module.exports = router;