const express = require('express');
const router = express.Router();
const controller = require('../controllers/prescriptionController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

// All routes require authentication
router.use(authenticate);

// 1. Search Catalog - Requires viewing capability
// (Doctors, Nurses, Admins usually have this)
router.get('/catalog/search', 
    checkPermission('view_patient_history'), 
    controller.searchDrugs
);

// 2. View Prescriptions for an Appointment
// (Doctors, Nurses, Admins)
router.get('/appointment/:appointment_id', 
    checkPermission('view_patient_history'), 
    controller.getPrescriptions
);

// 3. Add Prescription
// Requires specific 'manage_medical_records' or 'create_prescription' permission
// This blocks Receptionists/billers at the door.
router.post('/add', 
    checkPermission('manage_medical_records'), 
    controller.addPrescription
);

// 4. Delete Prescription
// Requires specific permission
router.delete('/:id', 
    checkPermission('manage_medical_records'), 
    controller.deletePrescription
);

module.exports = router;