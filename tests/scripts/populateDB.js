
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Invoice = require('../../models/Invoice');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/b2b_portal';

// Test data
const wholesalers = [
  {
    name: 'TechWholesale Co.',
    email: 'wholesaler1@techwholesale.com',
    password: 'password123',
    role: 'wholesaler',
    company: 'TechWholesale Co.',
    phone: '+1-555-0101',
  },
  {
    name: 'Global Electronics Supply',
    email: 'wholesaler2@globalelectronics.com',
    password: 'password123',
    role: 'wholesaler',
    company: 'Global Electronics Supply',
    phone: '+1-555-0102',
  },
  {
    name: 'Bulk Retail Solutions',
    email: 'wholesaler3@bulkretail.com',
    password: 'password123',
    role: 'wholesaler',
    company: 'Bulk Retail Solutions',
    phone: '+1-555-0103',
  },
];

const retailers = [
  {
    name: 'City Electronics Store',
    email: 'retailer1@cityelectronics.com',
    password: 'password123',
    role: 'retailer',
    company: 'City Electronics Store',
    phone: '+1-555-0201',
  },
  {
    name: 'MegaMart Retail',
    email: 'retailer2@megamart.com',
    password: 'password123',
    role: 'retailer',
    company: 'MegaMart Retail',
    phone: '+1-555-0202',
  },
  {
    name: 'Local Shop Network',
    email: 'retailer3@localshop.com',
    password: 'password123',
    role: 'retailer',
    company: 'Local Shop Network',
    phone: '+1-555-0203',
  },
  {
    name: 'QuickMart Convenience',
    email: 'retailer4@quickmart.com',
    password: 'password123',
    role: 'retailer',
    company: 'QuickMart Convenience',
    phone: '+1-555-0204',
  },
];

const admin = {
  name: 'System Administrator',
  email: 'admin@b2bportal.com',
  password: 'admin123',
  role: 'admin',
  company: 'B2B Portal Admin',
  phone: '+1-555-0000',
};

const productCategories = ['Electronics', 'Clothing', 'Home & Garden', 'Food & Beverages', 'Sports & Outdoors'];

const productTemplates = [
  { name: 'Smartphone', category: 'Electronics', basePrice: 300, stock: 50 },
  { name: 'Laptop', category: 'Electronics', basePrice: 800, stock: 30 },
  { name: 'Tablet', category: 'Electronics', basePrice: 250, stock: 40 },
  { name: 'Headphones', category: 'Electronics', basePrice: 80, stock: 100 },
  { name: 'T-Shirt', category: 'Clothing', basePrice: 15, stock: 200 },
  { name: 'Jeans', category: 'Clothing', basePrice: 45, stock: 150 },
  { name: 'Sneakers', category: 'Clothing', basePrice: 60, stock: 120 },
  { name: 'Garden Tools Set', category: 'Home & Garden', basePrice: 75, stock: 80 },
  { name: 'Plant Fertilizer', category: 'Home & Garden', basePrice: 25, stock: 200 },
  { name: 'Coffee Beans', category: 'Food & Beverages', basePrice: 20, stock: 300 },
  { name: 'Bottled Water (24pk)', category: 'Food & Beverages', basePrice: 12, stock: 500 },
  { name: 'Yoga Mat', category: 'Sports & Outdoors', basePrice: 35, stock: 90 },
  { name: 'Dumbbell Set', category: 'Sports & Outdoors', basePrice: 120, stock: 60 },
];

async function populateDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Invoice.deleteMany({});
    console.log('Existing data cleared');

    // Create Admin
    console.log('Creating admin user...');
    const adminPassword = await bcrypt.hash(admin.password, 10);
    const adminUser = await User.create({ ...admin, password: adminPassword });
    console.log(`Admin created: ${adminUser.email}`);

    // Create Wholesalers
    console.log('Creating wholesalers...');
    const createdWholesalers = [];
    for (const w of wholesalers) {
      const password = await bcrypt.hash(w.password, 10);
      const wholesaler = await User.create({ ...w, password });
      createdWholesalers.push(wholesaler);
      console.log(`Wholesaler created: ${wholesaler.email}`);
    }

    // Create Retailers
    console.log('Creating retailers...');
    const createdRetailers = [];
    for (const r of retailers) {
      const password = await bcrypt.hash(r.password, 10);
      const retailer = await User.create({ ...r, password });
      createdRetailers.push(retailer);
      console.log(`Retailer created: ${retailer.email}`);
    }

    // Create Products for each wholesaler
    console.log('Creating products...');
    const createdProducts = [];
    for (const wholesaler of createdWholesalers) {
      for (const template of productTemplates) {
        const product = await Product.create({
          name: `${template.name} - ${wholesaler.company}`,
          category: template.category,
          sku: `SKU-${wholesaler._id.toString().slice(-6)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          description: `High-quality ${template.name.toLowerCase()} from ${wholesaler.company}`,
          price: template.basePrice + Math.floor(Math.random() * 50) - 25, // Price variation
          stock: template.stock + Math.floor(Math.random() * 100) - 50, // Stock variation
          wholesaler: wholesaler._id,
        });
        createdProducts.push({ product, wholesaler });
      }
      console.log(`Created ${productTemplates.length} products for ${wholesaler.company}`);
    }

    // Create Orders
    console.log('Creating orders...');
    const orderStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const createdOrders = [];

    for (let i = 0; i < 20; i++) {
      const retailer = createdRetailers[Math.floor(Math.random() * createdRetailers.length)];
      const wholesalerProducts = createdProducts.filter(cp => 
        cp.wholesaler._id.toString() === createdWholesalers[Math.floor(Math.random() * createdWholesalers.length)]._id.toString()
      );
      
      if (wholesalerProducts.length === 0) continue;

      const items = [];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
      let total = 0;

      for (let j = 0; j < numItems && j < wholesalerProducts.length; j++) {
        const { product } = wholesalerProducts[j];
        const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 quantity
        items.push({
          product: product._id,
          quantity,
          price: product.price,
        });
        total += product.price * quantity;
      }

      if (items.length > 0) {
        const order = await Order.create({
          retailer: retailer._id,
          wholesaler: wholesalerProducts[0].wholesaler._id,
          items,
          total,
          status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
        });
        createdOrders.push(order);
      }
    }
    console.log(`Created ${createdOrders.length} orders`);

    // Create Invoices for some orders
    console.log('Creating invoices...');
    const deliveredOrders = createdOrders.filter(o => o.status === 'delivered');
    let invoiceNumber = 1000;

    for (const order of deliveredOrders.slice(0, 10)) {
      await Invoice.create({
        order: order._id,
        invoiceNumber: `INV-${invoiceNumber++}`,
        amount: order.total,
        issuedTo: order.retailer,
        issuedBy: order.wholesaler,
        status: Math.random() > 0.5 ? 'paid' : 'unpaid',
        createdAt: new Date(order.createdAt.getTime() + 24 * 60 * 60 * 1000), // 1 day after order
      });
    }
    console.log(`Created ${Math.min(deliveredOrders.length, 10)} invoices`);

    // Summary
    console.log('\n=== Database Population Summary ===');
    console.log(`Users: ${await User.countDocuments()}`);
    console.log(`  - Admins: ${await User.countDocuments({ role: 'admin' })}`);
    console.log(`  - Wholesalers: ${await User.countDocuments({ role: 'wholesaler' })}`);
    console.log(`  - Retailers: ${await User.countDocuments({ role: 'retailer' })}`);
    console.log(`Products: ${await Product.countDocuments()}`);
    console.log(`Orders: ${await Order.countDocuments()}`);
    console.log(`Invoices: ${await Invoice.countDocuments()}`);
    console.log('\n=== Test Credentials ===');
    console.log('Admin: admin@b2bportal.com / admin123');
    console.log('Wholesaler 1: wholesaler1@techwholesale.com / password123');
    console.log('Retailer 1: retailer1@cityelectronics.com / password123');
    console.log('\nDatabase populated successfully!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error populating database:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

if (require.main === module) {
  populateDatabase();
}

module.exports = { populateDatabase };

