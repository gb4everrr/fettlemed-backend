const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// Reception & Doctors & Patients (if you have a patient portal)
router.post('/', checkPermission('manage_appointments'), appointmentController.createAppointment);
router.put('/:id', checkPermission('manage_appointments'), appointmentController.updateAppointment);
router.put('/:id/toggle', checkPermission('manage_appointments'), appointmentController.toggleConfirmation);
router.delete('/:id', checkPermission('manage_appointments'), appointmentController.cancelAppointment);

router.get('/', checkPermission('view_all_schedule'), appointmentController.getAppointments);
router.get('/slots', checkPermission('manage_appointments'), appointmentController.getAvailableSlotsForAdmin);

module.exports = router;