const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String },
  sku: { type: String },
  description: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  wholesaler: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moq: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
