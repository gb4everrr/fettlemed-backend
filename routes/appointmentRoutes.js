const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.post('/', appointmentController.createAppointment);
router.put('/:id', appointmentController.updateAppointment);
router.put('/:id/toggle', appointmentController.toggleConfirmation);
router.delete('/:id', appointmentController.cancelAppointment);
router.get('/', appointmentController.getAppointments);
router.get('/slots', appointmentController.getAvailableSlotsForAdmin);

module.exports = router;