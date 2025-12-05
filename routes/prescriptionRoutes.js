const express = require('express');
const router = express.Router();
const controller = require('../controllers/prescriptionController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare'); // Import RBAC

router.use(authenticate);

// Only Doctors (and potentially Nurses) can create prescriptions
router.post('/', checkPermission('create_prescription'), controller.addPrescription);

// Doctors, Nurses, and Admins can view them.
// Note: 'view_patient_history' is a good blanket permission for this.
router.get('/:appointment_id', checkPermission('view_patient_history'), controller.getPrescription);

module.exports = router;