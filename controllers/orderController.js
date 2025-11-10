const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User'); // Import User to email wholesaler
const { sendEmail } = require('../utils/emailService'); // Import email utility

// Retailer creates order to wholesaler
exports.create = async (req, res) => {
  try {
    const { wholesalerId, items } = req.body;
    if (!wholesalerId || !items || !items.length) return res.status(400).json({ error: 'wholesalerId and items required' });
    
    // calculate total and check stock/MOQ
    let total = 0;
    for (const it of items) {
      const prod = await Product.findById(it.product);
      if (!prod) return res.status(400).json({ error: 'Product not found: ' + it.product });
      
      // MODIFIED: Check for MOQ
      if (it.quantity < prod.moq) {
        return res.status(400).json({ error: `Minimum order quantity for ${prod.name} is ${prod.moq}` });
      }
      
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

    // ADDED: Send email notifications
    try {
      // Notify retailer
      await sendEmail({
        to: req.user.email,
        subject: `Order Confirmed: #${order._id}`,
        text: `Hello ${req.user.name},\n\nYour order #${order._id} for $${total.toFixed(2)} has been placed successfully.\n\nThank you!`
      });

      // Notify wholesaler
      const wholesaler = await User.findById(wholesalerId);
      if (wholesaler) {
        await sendEmail({
          to: wholesaler.email,
          subject: `New Order Received: #${order._id}`,
          text: `Hello ${wholesaler.name},\n\nYou have received a new order #${order._id} from ${req.user.name} (Retailer) for $${total.toFixed(2)}.`
        });
      }
    } catch (emailError) {
      console.error("Failed to send order confirmation email:", emailError);
      // Don't fail the request, just log the email error
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

  // ADDED: Send email notification for status update
  try {
    await order.populate('retailer');
    if (order.retailer && order.retailer.email) {
      await sendEmail({
        to: order.retailer.email,
        subject: `Order Status Updated: #${order._id}`,
        text: `Hello ${order.retailer.name},\n\nThe status of your order #${order._id} has been updated to: ${status.toUpperCase()}.\n\nThank you!`
      });
    }
  } catch (emailError) {
    console.error("Failed to send status update email:", emailError);
  }

  res.json(order);
};