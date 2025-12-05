const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/rbacMiddleWare');

router.use(authenticate);
router.get('/kpi-metrics', checkPermission('view_analytics_ops'), dashboardController.getKpiMetrics);

module.exports = router;