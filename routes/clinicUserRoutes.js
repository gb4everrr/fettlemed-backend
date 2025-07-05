const express = require('express');
const router = express.Router();
const clinicUserController = require('../controllers/clinicUserController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.post('/clinic-doctor', clinicUserController.addClinicDoctor);
router.get('/clinic-doctor', clinicUserController.getClinicDoctors);
router.put('/clinic-doctor/:id', clinicUserController.updateClinicDoctor);
router.delete('/clinic-doctor/:id', clinicUserController.deleteClinicDoctor);

router.post('/clinic-patient', clinicUserController.addClinicPatient);
router.get('/clinic-patient', clinicUserController.getClinicPatients);
router.put('/clinic-patient/:id', clinicUserController.updateClinicPatient);
router.delete('/clinic-patient/:id', clinicUserController.deleteClinicPatient);

module.exports = router;