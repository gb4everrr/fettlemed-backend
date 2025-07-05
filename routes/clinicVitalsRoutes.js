const express = require('express');
const router = express.Router();
const clinicVitalsController = require('../controllers/clinicVitalsController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.post('/config/create', clinicVitalsController.createVitalConfig);
router.put('/config/update/:id', clinicVitalsController.updateVitalConfig);
router.delete('/config/delete/:id', clinicVitalsController.deleteVitalConfig);
router.get('/config/active', clinicVitalsController.getActiveVitalConfigs);
router.post('/entry/submit', clinicVitalsController.submitPatientVitals);
router.get('/entry/history/:clinic_patient_id', clinicVitalsController.getPatientVitals);

module.exports = router;