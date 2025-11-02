const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

router.get('/overview', authenticate, authorize('wholesaler'), async (req, res) => {
  const totalOrders = await Order.countDocuments({ wholesaler: req.user._id });
  const pending = await Order.countDocuments({ wholesaler: req.user._id, status: 'pending' });
  const products = await Product.find({ wholesaler: req.user._id }).limit(10);
  res.json({ totalOrders, pending, recentProducts: products });
});

module.exports = router;