const express = require('express');
const router = express.Router();
const rc = require('../controllers/reportController');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/sales', authenticate, authorize('wholesaler'), rc.sales);
router.get('/inventory', authenticate, authorize('wholesaler'), rc.inventory);
router.get('/customers', authenticate, authorize('wholesaler'), rc.customers);

module.exports = router;