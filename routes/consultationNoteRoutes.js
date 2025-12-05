const express = require('express');
const router = express.Router();
const controller = require('../controllers/consultationNoteController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);
router.post('/', checkPermission('manage_medical_records'), controller.addNote);
router.get('/:appointment_id', checkPermission('view_patient_history'), controller.getNotesByAppointment);

module.exports = router;
