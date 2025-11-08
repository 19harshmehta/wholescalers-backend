const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Invoice = require('../../models/Invoice');
const bcrypt = require('bcryptjs');
const { signToken } = require('../../utils/jwt');

//  Create a test user

exports.createTestUser = async (userData = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: await bcrypt.hash('password123', 10),
    role: 'retailer',
    company: 'Test Company',
    phone: '1234567890',
  };
  
  const user = await User.create({ ...defaultUser, ...userData });
  return user;
};

//  Create a test wholesaler
 
exports.createTestWholesaler = async (userData = {}) => {
  return exports.createTestUser({ ...userData, role: 'wholesaler' });
};

//  Create a test retailer
 
exports.createTestRetailer = async (userData = {}) => {
  return exports.createTestUser({ ...userData, role: 'retailer' });
};

// Create a test admin
 
exports.createTestAdmin = async (userData = {}) => {
  return exports.createTestUser({ ...userData, role: 'admin' });
};

//  Create a test product
 
exports.createTestProduct = async (productData = {}, wholesalerId = null) => {
  if (!wholesalerId) {
    const wholesaler = await exports.createTestWholesaler();
    wholesalerId = wholesaler._id;
  }
  
  const defaultProduct = {
    name: 'Test Product',
    category: 'Electronics',
    sku: `SKU-${Date.now()}`,
    description: 'Test product description',
    price: 100.00,
    stock: 50,
    wholesaler: wholesalerId,
  };
  
  const product = await Product.create({ ...defaultProduct, ...productData });
  return product;
};

// Create a test order
 
exports.createTestOrder = async (orderData = {}) => {
  const retailer = await exports.createTestRetailer();
  const wholesaler = await exports.createTestWholesaler();
  const product = await exports.createTestProduct({}, wholesaler._id);
  
  const defaultOrder = {
    retailer: retailer._id,
    wholesaler: wholesaler._id,
    items: [{
      product: product._id,
      quantity: 2,
      price: product.price,
    }],
    total: product.price * 2,
    status: 'pending',
  };
  
  const order = await Order.create({ ...defaultOrder, ...orderData });
  return { order, retailer, wholesaler, product };
};

// Get auth token for a user
 
exports.getAuthToken = (user) => {
  return signToken(user);
};


//  Create auth headers for API requests
 
exports.getAuthHeaders = (user) => {
  const token = exports.getAuthToken(user);
  return { Authorization: `Bearer ${token}` };
};

