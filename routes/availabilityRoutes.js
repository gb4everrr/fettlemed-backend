const express = require('express');
const router = express.Router();
const doctorAvailabilityController = require('../controllers/doctorAvailabilityController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// Both Doctors (for themselves) and Admins (for others) need this permission
router.post('/availability', checkPermission('manage_availability'), doctorAvailabilityController.addAvailability);
router.put('/availability/:id', checkPermission('manage_availability'), doctorAvailabilityController.updateAvailability);
router.get('/availability', checkPermission('view_all_schedule'), doctorAvailabilityController.getAvailability); // Reception needs to see it
router.delete('/availability/:id', checkPermission('manage_availability'), doctorAvailabilityController.deleteAvailability);

// Exceptions (Time off)
router.post('/exception', checkPermission('manage_availability'), doctorAvailabilityController.addException);
router.get('/exception', checkPermission('view_all_schedule'), doctorAvailabilityController.getExceptions);
router.delete('/exception/:id', checkPermission('manage_availability'), doctorAvailabilityController.deleteException);

module.exports = router;