const express = require('express');
const router = express.Router();
const controller = require('../controllers/diagnosisController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// Search (Viewers can search)
router.get('/catalog/search', checkPermission('view_patient_history'), controller.searchCatalog);

// Get List & Comments (Viewers can see)
router.get('/appointment/:appointment_id', checkPermission('view_patient_history'), controller.getDiagnoses);

// Add Diagnosis (Editors only)
router.post('/add', checkPermission('manage_medical_records'), controller.addDiagnosis);

// Remove Diagnosis (Editors only)
router.delete('/:id', checkPermission('manage_medical_records'), controller.removeDiagnosis);

// Save Comments (Editors only)
router.post('/comments', checkPermission('manage_medical_records'), controller.saveComments);

module.exports = router;