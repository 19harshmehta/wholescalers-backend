const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');

router.get('/overview', authenticate, authorize('wholesaler'), async (req, res) => {
  try {
    const wholesalerId = req.user._id;
    const lowStockThreshold = 10; // Define your low stock threshold here

    // Run queries in parallel for efficiency
    const [
      totalOrders,
      pending,
      revenueResult,
      totalCustomers,
      lowStockProducts
    ] = await Promise.all([
      // Total Orders
      Order.countDocuments({ wholesaler: wholesalerId }),
      
      // Pending Orders
      Order.countDocuments({ wholesaler: wholesalerId, status: 'pending' }),
      
      // Total Revenue (sum of 'delivered' or 'shipped' orders)
      Order.aggregate([
        { $match: { wholesaler: wholesalerId, status: { $in: ['delivered', 'shipped'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
      ]),
      
      // Total Customers (distinct retailers)
      Order.distinct('retailer', { wholesaler: wholesalerId }),
      
      // Low Stock Products
      Product.find({ 
        wholesaler: wholesalerId, 
        stock: { $lte: lowStockThreshold } 
      }).select('name stock').lean()
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.json({
      totalOrders,
      pendingOrders: pending,
      totalRevenue,
      totalCustomers: totalCustomers.length,
      lowStockProducts
    });

  } catch (err) {
    console.error("Error fetching dashboard overview:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;