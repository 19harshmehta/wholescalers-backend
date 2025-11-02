const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

exports.sales = async (req, res) => {
  // simple sales report: total sales and orders
  const match = {};
  if (req.query.wholesaler) match.wholesaler = req.query.wholesaler;
  const orders = await Order.find(match);
  const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
  res.json({ totalOrders: orders.length, totalSales });
};

exports.inventory = async (req, res) => {
  const q = {};
  if (req.query.wholesaler) q.wholesaler = req.query.wholesaler;
  const products = await Product.find(q);
  res.json({ count: products.length, products });
};

exports.customers = async (req, res) => {
  // customers for wholesaler: retailers who placed orders
  const wholesaler = req.query.wholesaler || req.user._id;
  const orders = await Order.find({ wholesaler }).populate('retailer');
  const customers = {};
  orders.forEach(o => {
    if (o.retailer) customers[o.retailer._id] = { id: o.retailer._id, name: o.retailer.name, email: o.retailer.email };
  });
  res.json({ count: Object.keys(customers).length, customers: Object.values(customers) });
};
