router.get('/appointments', authenticate, doctorController.getDoctorAppointments);
router.get('/my-clinics', doctorController.getAssociatedClinics);
router.post('/availability', doctorController.createAvailability);
router.get('/availability', doctorController.getAvailability);
router.post('/availability-exception', doctorController.createAvailabilityException);
