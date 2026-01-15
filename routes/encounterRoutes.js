const express = require('express');
const router = express.Router();
const controller = require('../controllers/encounterController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// Aggregated Data
router.get('/:appointmentId', checkPermission('view_patient_history'), controller.getEncounterDetails);

// Search Catalogs (Permissions: 'view_services' is a safe proxy, or create a generic 'view_clinical_data')
router.get('/search/drugs', controller.searchDrugs);
router.get('/search/diagnosis', controller.searchDiagnoses);
router.get('/search/labs', controller.searchLabs);

// Transactional - Diagnosis
router.post('/diagnosis', checkPermission('manage_medical_records'), controller.addDiagnosis);
router.delete('/diagnosis/:id', checkPermission('manage_medical_records'), controller.removeDiagnosis);

// Transactional - Lab Orders
router.post('/labs', checkPermission('create_prescription'), controller.addLabOrder); // Reusing rx permission
router.delete('/labs/:id', checkPermission('create_prescription'), controller.removeLabOrder);

module.exports = router;