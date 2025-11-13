const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User"); // Import User to email wholesaler
const { sendEmail } = require("../utils/emailService"); // Import email utility

// helper to populate an order
const populateOrder = (query) =>
  query.populate("items.product").populate("retailer").populate("wholesaler");

// Retailer creates order to wholesaler
exports.create = async (req, res) => {
  try {
    const { wholesalerId, items } = req.body;
    if (!wholesalerId || !items || !items.length)
      return res.status(400).json({ error: "wholesalerId and items required" });

    // calculate total and check stock/MOQ
    let total = 0;
    for (const it of items) {
      const prod = await Product.findById(it.product);
      if (!prod)
        return res
          .status(400)
          .json({ error: "Product not found: " + it.product });

      // Check for MOQ
      if (it.quantity < prod.moq) {
        return res.status(400).json({
          error: `Minimum order quantity for ${prod.name} is ${prod.moq}`,
        });
      }

      if (prod.stock < it.quantity)
        return res
          .status(400)
          .json({ error: "Insufficient stock for " + prod.name });
      // Use product price if price not provided
      const unitPrice =
        typeof it.price === "number" && it.price > 0 ? it.price : prod.price;
      total += unitPrice * it.quantity;
      // ensure price in the item stored is the unit price
      it.price = unitPrice;
    }

    const order = await Order.create({
      retailer: req.user._id,
      wholesaler: wholesalerId,
      items: items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        price: i.price,
      })),
      total,
    });

    // optionally reduce stock (depends on business logic) - we'll reserve stock
    for (const it of items) {
      await Product.findByIdAndUpdate(it.product, {
        $inc: { stock: -it.quantity },
      });
    }

    // Re-fetch the created order with populated refs
    const populatedOrder = await populateOrder(Order.findById(order._id));

    // Send email notifications (use populated objects if available)
    try {
      // Notify retailer
      const retailer = populatedOrder.retailer || req.user; // fallback
      if (retailer && retailer.email) {
        await sendEmail({
          to: retailer.email,
          subject: `Order Confirmed: #${populatedOrder._id}`,
          text: `Hello ${retailer.name || ""},\n\nYour order #${
            populatedOrder._id
          } for $${populatedOrder.total.toFixed(
            2
          )} has been placed successfully.\n\nThank you!`,
        });
      }

      // Notify wholesaler
      const wholesaler = populatedOrder.wholesaler;
      if (!wholesaler) {
        // fallback: try loading wholesaler by id (rare)
        // const fetchedWholesaler = await User.findById(wholesalerId);
        // if (fetchedWholesaler) { ... }
      } else if (wholesaler.email) {
        await sendEmail({
          to: wholesaler.email,
          subject: `New Order Received: #${populatedOrder._id}`,
          text: `Hello ${
            wholesaler.name || ""
          },\n\nYou have received a new order #${populatedOrder._id} from ${
            retailer.name || "a retailer"
          } for $${populatedOrder.total.toFixed(2)}.`,
        });
      }
    } catch (emailError) {
      console.error("Failed to send order confirmation email:", emailError);
      // Don't fail the request, just log the email error
    }

    res.status(201).json(populatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.listForUser = async (req, res) => {
  try {
    const q = {};
    if (req.user.role === "retailer") q.retailer = req.user._id;
    if (req.user.role === "wholesaler") q.wholesaler = req.user._id;
    const ordersQuery = Order.find(q).sort({ createdAt: -1 });
    const orders = await populateOrder(ordersQuery).exec();
    res.json({ count: orders.length, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.get = async (req, res) => {
  try {
    const order = await populateOrder(Order.findById(req.params.id)).exec();
    if (!order) return res.status(404).json({ error: "Not found" });
    // Authorization check (use populated ids)
    const retailerId = order.retailer
      ? order.retailer._id.toString()
      : order.retailer?.toString();
    const wholesalerId = order.wholesaler
      ? order.wholesaler._id.toString()
      : order.wholesaler?.toString();
    if (
      retailerId !== req.user._id.toString() &&
      wholesalerId !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Not found" });
    // Authorization check
    if (order.wholesaler.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }
    order.status = status;
    await order.save();

    // Re-populate before responding and emailing
    const populatedOrder = await populateOrder(
      Order.findById(order._id)
    ).exec();

    // Send email notification for status update
    try {
      if (populatedOrder.retailer && populatedOrder.retailer.email) {
        await sendEmail({
          to: populatedOrder.retailer.email,
          subject: `Order Status Updated: #${populatedOrder._id}`,
          text: `Hello ${
            populatedOrder.retailer.name || ""
          },\n\nThe status of your order #${
            populatedOrder._id
          } has been updated to: ${status.toUpperCase()}.\n\nThank you!`,
        });
      }
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
    }

    res.json(populatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
