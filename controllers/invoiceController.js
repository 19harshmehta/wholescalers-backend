const Invoice = require('../models/Invoice');
const Order = require('../models/Order');

exports.createForOrder = async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  // Authorization check
  if (order.wholesaler.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
  }
  const invoiceNumber = 'INV-' + Date.now();
  const invoice = await Invoice.create({
    order: order._id,
    invoiceNumber,
    amount: order.total,
    issuedTo: order.retailer,
    issuedBy: order.wholesaler
  });
  res.status(201).json(invoice);
};

exports.get = async (req, res) => {
  const inv = await Invoice.findById(req.params.id).populate('order');
  if (!inv) return res.status(404).json({ error: 'Not found' });
  // Authorization check
  if (inv.issuedTo.toString() !== req.user._id.toString() && inv.issuedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(inv);
};

exports.listForRetailer = async (req, res) => {
  const inv = await Invoice.find({ issuedTo: req.user._id }).populate('order');
  res.json({ count: inv.length, invoices: inv });
};

exports.listForWholesaler = async (req, res) => {
    const inv = await Invoice.find({ issuedBy: req.user._id }).populate('order');
    res.json({ count: inv.length, invoices: inv });
};