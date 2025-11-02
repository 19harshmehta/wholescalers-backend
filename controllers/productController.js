const Product = require('../models/Product');

exports.list = async (req, res) => {
  const query = {};
  if (req.user && req.user.role === 'wholesaler') query.wholesaler = req.user._id;
  if (req.query.category) query.category = req.query.category;
  const products = await Product.find(query);
  res.json({ count: products.length, products });
};

exports.create = async (req, res) => {
  try {
    const body = req.body;
    body.wholesaler = req.user._id;
    const p = await Product.create(body);
    res.status(201).json(p);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Invalid data' });
  }
};

exports.get = async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
};

exports.update = async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
};

exports.remove = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
