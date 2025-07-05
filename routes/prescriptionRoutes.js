const express = require('express');
const router = express.Router();
const controller = require('../controllers/prescriptionController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.post('/', controller.addPrescription);
router.get('/:appointment_id', controller.getPrescription);

module.exports = router;
