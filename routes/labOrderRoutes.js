const express = require('express');
const router = express.Router();
const controller = require('../controllers/labOrderController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

router.get('/catalog/search', checkPermission('view_patient_history'), controller.searchCatalog);
router.get('/appointment/:appointment_id', checkPermission('view_patient_history'), controller.getAppointmentOrders);
router.post('/create', checkPermission('manage_medical_records'), controller.createOrder);

module.exports = router;