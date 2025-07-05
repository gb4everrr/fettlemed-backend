const express = require('express');
const router = express.Router();
const clinicInvoiceController = require('../controllers/clinicInvoiceController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

// Service routes
router.post('/service/create', clinicInvoiceController.createService);
router.put('/service/update/:id', clinicInvoiceController.updateService);
router.delete('/service/delete/:id', clinicInvoiceController.deleteService);
router.get('/service/list', clinicInvoiceController.listServices);

// Invoice routes
router.post('/invoice/create', clinicInvoiceController.createInvoice);
router.get('/invoice/:id', clinicInvoiceController.getInvoiceDetails);

module.exports = router;