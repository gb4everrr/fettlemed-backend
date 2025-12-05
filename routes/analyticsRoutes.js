const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/clinicAnalyticsController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);

router.get('/doctor-performance', checkPermission('view_analytics_doc'), analyticsController.getDoctorPerformance);
router.get('/operational', checkPermission('view_analytics_ops'), analyticsController.getOperationalMetrics);
router.get('/financial', checkPermission('view_financials'), analyticsController.getFinancialReports);

module.exports = router;