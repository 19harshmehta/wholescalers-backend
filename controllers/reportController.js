const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { Parser } = require('json2csv'); // ADDED: for CSV export
const mongoose = require('mongoose'); // ADDED: for customer aggregation

exports.sales = async (req, res) => {
  // MODIFIED: simple sales report: total sales and orders with date filtering
  const { wholesaler, startDate, endDate } = req.query;
  const match = {};
  
  // Use req.user._id as default wholesaler if role is wholesaler
  if (req.user.role === 'wholesaler') {
    match.wholesaler = req.user._id;
  } else if (wholesaler) {
    // Allow admins to query by wholesaler
    match.wholesaler = new mongoose.Types.ObjectId(wholesaler);
  }

  // Add date range filtering
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) {
      match.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      // Set to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match.createdAt.$lte = end;
    }
  }

  const orders = await Order.find(match);
  const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
  res.json({ totalOrders: orders.length, totalSales });
};

exports.inventory = async (req, res) => {
  const q = {};
  // MODIFIED: Use req.user._id as default wholesaler
  if (req.user.role === 'wholesaler') {
    q.wholesaler = req.user._id;
  } else if (req.query.wholesaler) {
    q.wholesaler = req.query.wholesaler;
  }
  
  const products = await Product.find(q);
  res.json({ count: products.length, products });
};

exports.customers = async (req, res) => {
  // MODIFIED: customers for wholesaler: retailers who placed orders
  // We will use an aggregation to get total spent and total orders per customer.
  
  const wholesalerId = req.query.wholesaler ? new mongoose.Types.ObjectId(req.query.wholesaler) : req.user._id;

  try {
    const customerData = await Order.aggregate([
      {
        $match: { wholesaler: wholesalerId }
      },
      {
        $group: {
          _id: "$retailer",
          totalSpent: { $sum: "$total" },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users', // The name of the User collection
          localField: '_id',
          foreignField: '_id',
          as: 'retailerInfo'
        }
      },
      {
        $unwind: '$retailerInfo'
      },
      {
        $project: {
          _id: 0,
          id: '$retailerInfo._id',
          name: '$retailerInfo.name',
          email: '$retailerInfo.email',
          company: '$retailerInfo.company',
          phone: '$retailerInfo.phone',
          totalSpent: 1,
          totalOrders: 1
        }
      },
      {
        $sort: { totalSpent: -1 } // Sort by most valuable customers
      }
    ]);

    res.json({ count: customerData.length, customers: customerData });
  } catch (error) {
    console.error('Error in customer report aggregation:', error);
    res.status(500).json({ error: 'Failed to generate customer report' });
  }
};


// ADDED: New function to handle report exports
exports.exportReport = async (req, res) => {
  const { reportType, startDate, endDate } = req.query;
  const wholesalerId = req.user._id;
  
  let data;
  let fields;

  try {
    if (reportType === 'inventory') {
      const products = await Product.find({ wholesaler: wholesalerId }).lean();
      data = products;
      fields = ['name', 'sku', 'category', 'price', 'stock', 'moq', 'createdAt'];

    } else if (reportType === 'sales') {
      const match = { wholesaler: wholesalerId };
      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) {
           const end = new Date(endDate);
           end.setHours(23, 59, 59, 999);
           match.createdAt.$lte = end;
        }
      }
      data = await Order.find(match).populate('retailer', 'name email company').lean();
      // Flatten the data for CSV
      data = data.map(order => ({
        orderId: order._id,
        retailerName: order.retailer ? order.retailer.name : 'N/A',
        retailerEmail: order.retailer ? order.retailer.email : 'N/A',
        retailerCompany: order.retailer ? order.retailer.company : 'N/A',
        total: order.total,
        status: order.status,
        itemsCount: order.items.length,
        createdAt: order.createdAt,
      }));
      fields = ['orderId', 'retailerName', 'retailerEmail', 'retailerCompany', 'total', 'status', 'itemsCount', 'createdAt'];
    
    } else if (reportType === 'customers') {
      const customerAgg = await Order.aggregate([
        { $match: { wholesaler: wholesalerId } },
        { $group: { _id: "$retailer", totalSpent: { $sum: "$total" }, totalOrders: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'retailerInfo' } },
        { $unwind: '$retailerInfo' },
        { $project: { _id: 0, id: '$retailerInfo._id', name: '$retailerInfo.name', email: '$retailerInfo.email', company: '$retailerInfo.company', phone: '$retailerInfo.phone', totalSpent: 1, totalOrders: 1 } },
        { $sort: { totalSpent: -1 } }
      ]);
      data = customerAgg;
      fields = ['id', 'name', 'email', 'company', 'phone', 'totalSpent', 'totalOrders'];

    } else {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found for this report' });
    }

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    const fileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;

    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    res.send(csv);

  } catch (err) {
    console.error(`Error exporting ${reportType} report:`, err);
    res.status(500).json({ error: 'Server error during report export' });
  }
};