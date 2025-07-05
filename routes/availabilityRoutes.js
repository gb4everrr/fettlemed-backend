const express = require('express');
const router = express.Router();
const doctorAvailabilityController = require('../controllers/doctorAvailabilityController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

// Availability
router.post('/availability', doctorAvailabilityController.addAvailability);
router.put('/availability/:id', doctorAvailabilityController.updateAvailability);
router.get('/availability', doctorAvailabilityController.getAvailability);
router.delete('/availability/:id', doctorAvailabilityController.deleteAvailability);

// Exceptions
router.post('/exception', doctorAvailabilityController.addException);
router.get('/exception', doctorAvailabilityController.getExceptions);
router.delete('/exception/:id', doctorAvailabilityController.deleteException);

module.exports = router;