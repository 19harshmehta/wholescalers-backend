// models/Invoice.js

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  invoiceNumber: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  issuedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  // Storing Razorpay specific IDs now
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', invoiceSchema);