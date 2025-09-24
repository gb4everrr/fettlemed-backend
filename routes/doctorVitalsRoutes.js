const express = require('express');
const router = express.Router();
const vitalAccessController = require('../controllers/vitalAccessController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.get('/patient', vitalAccessController.getVitalsForPatient);

module.exports = router;
