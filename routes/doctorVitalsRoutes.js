const express = require('express');
const router = express.Router();
const vitalAccessController = require('../controllers/vitalAccessController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// Accessing patient vitals requires permission to view history
router.get('/patient', checkPermission('view_patient_history'), vitalAccessController.getVitalsForPatient);

module.exports = router;