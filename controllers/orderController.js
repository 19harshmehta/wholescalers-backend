const Order = require('../models/Order');
const Product = require('../models/Product');

// Retailer creates order to wholesaler
exports.create = async (req, res) => {
  try {
    const { wholesalerId, items } = req.body;
    if (!wholesalerId || !items || !items.length) return res.status(400).json({ error: 'wholesalerId and items required' });
    // calculate total and check stock
    let total = 0;
    for (const it of items) {
      const prod = await Product.findById(it.product);
      if (!prod) return res.status(400).json({ error: 'Product not found: ' + it.product });
      if (prod.stock < it.quantity) return res.status(400).json({ error: 'Insufficient stock for ' + prod.name });
      total += prod.price * it.quantity;
    }
    const order = await Order.create({
      retailer: req.user._id,
      wholesaler: wholesalerId,
      items: items.map(i => ({ product: i.product, quantity: i.quantity, price: i.price || 0 })),
      total
    });
    // optionally reduce stock (depends on business logic) - we'll reserve stock
    for (const it of items) {
      await Product.findByIdAndUpdate(it.product, { $inc: { stock: -it.quantity } });
    }
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.listForUser = async (req, res) => {
  const q = {};
  if (req.user.role === 'retailer') q.retailer = req.user._id;
  if (req.user.role === 'wholesaler') q.wholesaler = req.user._id;
  const orders = await Order.find(q).populate('items.product').sort({ createdAt: -1 });
  res.json({ count: orders.length, orders });
};

exports.get = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.product');
  if (!order) return res.status(404).json({ error: 'Not found' });
  // Authorization check
  if (order.retailer.toString() !== req.user._id.toString() && order.wholesaler.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(order);
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
   // Authorization check
  if (order.wholesaler.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  order.status = status;
  await order.save();
  res.json(order);
};