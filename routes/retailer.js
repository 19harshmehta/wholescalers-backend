const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const Order = require('../models/Order');

router.get('/overview', authenticate, authorize('retailer'), async (req, res) => {
  const myOrders = await Order.find({ retailer: req.user._id }).sort({ createdAt: -1 }).limit(10);
  res.json({ ordersCount: myOrders.length, recentOrders: myOrders });
});

module.exports = router;