const express = require('express');
const router = express.Router();
const controller = require('../controllers/consultationNoteController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.post('/', controller.addNote);
router.get('/:appointment_id', controller.getNotesByAppointment);

module.exports = router;
