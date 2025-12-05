const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');
const authenticate = require('../middleware/authenticate'); // JWT middleware
const { checkPermission } = require('../middleware/rbacMiddleWare');

// Registering a new clinic doesn't require permission *in* a clinic, just auth
router.post('/register', authenticate, clinicController.createClinic);   

// Getting my list of clinics is user-level, not clinic-level
router.get('/my', authenticate, clinicController.getMyClinics);          

// Updating a specific clinic DOES require permission inside that clinic
router.put('/:id', authenticate, checkPermission('manage_clinic_profile'), clinicController.updateClinic); 
router.get('/:id', authenticate, checkPermission('view_clinic_details'), clinicController.getClinicDetails);

router.get('/:clinic_id/branches', authenticate, checkPermission('manage_clinic_profile'), clinicController.getClinicBranches);
router.post('/:clinic_id/branch', authenticate, checkPermission('manage_branches'), clinicController.createBranch);

// This seems to be a Super-Super Admin route (Platform owner), be careful
router.get('/all', authenticate, clinicController.getAllClinics);




module.exports = router;