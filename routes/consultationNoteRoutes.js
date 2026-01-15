const express = require('express');
const router = express.Router();
const controller = require('../controllers/consultationNoteController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// 1. Get History (Requires view history permission)
router.get('/:note_id/history', checkPermission('view_patient_history'), controller.getNoteHistory);

// 2. Get Previous Notes Context
router.get('/context/previous', checkPermission('view_patient_history'), controller.getPreviousNotes);

// 3. Get Current Note
router.get('/:appointment_id', checkPermission('view_patient_history'), controller.getNotesByAppointment);

// 4. Save/Update Note (Requires manage records permission)
// Note: The controller handles the stricter "Assigned Doctor Only" check internally
router.post('/', checkPermission('manage_medical_records'), controller.addNote);

module.exports = router;