const express = require('express');
const router = express.Router();
const clinicInvoiceController = require('../controllers/clinicInvoiceController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

// Service Items (Admin/Owners usually manage pricing)
router.post('/service/create', checkPermission('manage_services'), clinicInvoiceController.createService);
router.put('/service/update/:id', checkPermission('manage_services'), clinicInvoiceController.updateService);
router.post('/service/delete/:id', checkPermission('manage_services'), clinicInvoiceController.deleteService);
router.get('/service/list', checkPermission('view_services'), clinicInvoiceController.listServices); // Reception needs this

// Invoices
router.post('/invoice/create', checkPermission('manage_invoices'), clinicInvoiceController.createInvoice);
router.put('/invoice/:id', checkPermission('manage_invoices'), clinicInvoiceController.updateInvoice);
// "view_financials" is strict, but "process_payments" allows Reception to see specific invoices
router.get('/invoice/:id', checkPermission('process_payments'), clinicInvoiceController.getInvoiceDetails);
router.get('/invoices/list', checkPermission('view_financials'), clinicInvoiceController.listInvoices);

module.exports = router;