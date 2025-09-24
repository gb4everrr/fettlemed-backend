const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');
const authenticate = require('../middleware/authenticate'); // JWT middleware

router.post('/register', authenticate, clinicController.createClinic);   // /api/clinic/register
router.get('/all', authenticate, clinicController.getAllClinics);        // /api/clinic/all
router.get('/my', authenticate, clinicController.getMyClinics);          // /api/clinic/my
router.put('/:id', authenticate, clinicController.updateClinic);        // /api/clinic/:id (for updates)



module.exports = router;