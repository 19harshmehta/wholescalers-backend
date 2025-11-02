const express = require('express');
const router = express.Router();
const oc = require('../controllers/orderController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/', authenticate, authorize('retailer'), oc.create);
router.get('/', authenticate, oc.listForUser);
router.get('/:id', authenticate, oc.get);
router.put('/:id/status', authenticate, authorize('wholesaler'), oc.updateStatus);

module.exports = router;