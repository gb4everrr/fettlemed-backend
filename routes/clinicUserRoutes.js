const express = require('express');
const router = express.Router();
const clinicUserController = require('../controllers/clinicUserController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');


router.use(authenticate);

// Staff Management (Admins only)
router.post('/clinic-doctor', checkPermission('manage_staff'), clinicUserController.addClinicDoctor);
router.put('/clinic-doctor/:id', checkPermission('manage_staff'), clinicUserController.updateClinicDoctor);
router.delete('/clinic-doctor/:id', checkPermission('manage_staff'), clinicUserController.deleteClinicDoctor);
router.get('/clinic-doctor', checkPermission('view_all_schedule'), clinicUserController.getClinicDoctors); // Reception needs to see doctors to book them
router.get('/clinic-doctor/:id', checkPermission('view_all_schedule'), clinicUserController.getClinicDoctor);

// Patient Management (Receptionists)
router.post('/clinic-patient', checkPermission('manage_patients'), clinicUserController.addClinicPatient);
router.get('/clinic-patient', checkPermission('view_all_schedule'), clinicUserController.getClinicPatients); // Nurses need to list patients
router.put('/clinic-patient/:id', checkPermission('manage_patients'), clinicUserController.updateClinicPatient);
router.delete('/clinic-patient/:id', checkPermission('manage_patients'), clinicUserController.deleteClinicPatient);
router.get('/clinic-patient/:id', checkPermission('view_patient_history'), clinicUserController.getClinicPatient);

router.get('/staff', checkPermission('manage_staff'), clinicUserController.getClinicStaff);
router.post('/add-staff', checkPermission('manage_staff'), clinicUserController.addStaffMember);
router.post('/remove-staff', checkPermission('manage_staff'), clinicUserController.removeStaffMember);

router.put('/staff-permissions', 
  checkPermission('manage_roles'), 
  clinicUserController.updateStaffPermissions
);

module.exports = router;