#!/usr/bin/env node

/**
 * Load Testing Setup Script
 * Prepares the database for load testing with optimized data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/b2b_portal';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function setupLoadTestData() {
  try {
    log('\n╔════════════════════════════════════════════════════╗', 'cyan');
    log('║     LOAD TEST DATABASE SETUP                      ║', 'cyan');
    log('╚════════════════════════════════════════════════════╝\n', 'cyan');

    log('📝 Connecting to MongoDB...', 'blue');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log('✓ Connected to MongoDB', 'green');

    // Clear existing test data
    log('\n🗑️  Clearing existing test data...', 'blue');
    const deletedUsers = await User.deleteMany({});
    const deletedProducts = await Product.deleteMany({});
    const deletedOrders = await Order.deleteMany({});
    log(`✓ Cleared: ${deletedUsers.deletedCount} users, ${deletedProducts.deletedCount} products, ${deletedOrders.deletedCount} orders`, 'green');

    // Create 5 wholesalers
    log('\n👷 Creating wholesalers...', 'blue');
    const wholesalers = [];
    for (let i = 1; i <= 5; i++) {
      const pwd = await bcrypt.hash('password123', 10);
      const wholesaler = await User.create({
        name: `Wholesaler ${i}`,
        email: `wholesaler${i}@wholesale.com`,
        password: pwd,
        role: 'wholesaler',
        company: `Wholesale Company ${i}`,
        phone: `91${String(i).padStart(10, '0')}`
      });
      wholesalers.push(wholesaler);
      log(`  ✓ Wholesaler ${i}: ${wholesaler.email}`, 'yellow');
    }

    // Create 10 retailers
    log('\n🏪 Creating retailers...', 'blue');
    const retailers = [];
    for (let i = 1; i <= 10; i++) {
      const pwd = await bcrypt.hash('password123', 10);
      const retailer = await User.create({
        name: `Retailer ${i}`,
        email: `retailer${i}@retail.com`,
        password: pwd,
        role: 'retailer',
        company: `Retail Store ${i}`,
        phone: `91${String(i).padStart(10, '0')}`
      });
      retailers.push(retailer);
      log(`  ✓ Retailer ${i}: ${retailer.email}`, 'yellow');
    }

    // Create products for each wholesaler
    log('\n📦 Creating products...', 'blue');
    const products = [];
    const productNames = [
      'Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Component Pro',
      'Sensor Plus', 'Module 2000', 'Device Max', 'Tool Pro', 'Accessory Set'
    ];

    for (const wholesaler of wholesalers) {
      for (let i = 0; i < 15; i++) {
        const product = await Product.create({
          name: `${productNames[i % productNames.length]} - Batch ${wholesaler.company}`,
          category: ['Electronics', 'Hardware', 'Software', 'Accessories'][i % 4],
          sku: `SKU-${wholesaler._id.toString().slice(0, 8)}-${i}`,
          description: `High-quality product from ${wholesaler.company}`,
          price: Math.floor(Math.random() * 9000 + 100),
          stock: Math.floor(Math.random() * 5000 + 500),
          minOrderQuantity: Math.floor(Math.random() * 20 + 5),
          wholesaler: wholesaler._id
        });
        products.push({ product, wholesalerId: wholesaler._id.toString() });
      }
      log(`  ✓ Created 15 products for ${wholesaler.company}`, 'yellow');
    }

    // Create orders
    log('\n📋 Creating orders...', 'blue');
    const statuses = ['pending', 'confirmed', 'shipped', 'delivered'];
    const orders = [];

    for (let i = 0; i < 30; i++) {
      const retailer = retailers[Math.floor(Math.random() * retailers.length)];
      const retailerProducts = products.filter(
        p => p.wholesalerId === wholesalers[Math.floor(Math.random() * wholesalers.length)]._id.toString()
      );

      if (retailerProducts.length === 0) continue;

      const items = [];
      const numItems = Math.floor(Math.random() * 3) + 1;
      let total = 0;

      for (let j = 0; j < numItems && j < retailerProducts.length; j++) {
        const { product } = retailerProducts[j];
        const quantity = Math.floor(Math.random() * 50) + 10;
        items.push({
          product: product._id,
          quantity,
          price: product.price
        });
        total += product.price * quantity;
      }

      if (items.length > 0) {
        const order = await Order.create({
          retailer: retailer._id,
          wholesaler: retailerProducts[0].product.wholesaler,
          items,
          total,
          status: statuses[Math.floor(Math.random() * statuses.length)]
        });
        orders.push(order);
      }
    }
    log(`  ✓ Created ${orders.length} orders`, 'yellow');

    // Summary
    log('\n' + '═'.repeat(50), 'cyan');
    log('DATABASE POPULATION COMPLETE', 'cyan');
    log('═'.repeat(50), 'cyan');

    const stats = {
      users: await User.countDocuments(),
      wholesalers: await User.countDocuments({ role: 'wholesaler' }),
      retailers: await User.countDocuments({ role: 'retailer' }),
      products: await Product.countDocuments(),
      orders: await Order.countDocuments()
    };

    log(`\n📊 FINAL COUNTS:`, 'cyan');
    log(`   Users: ${stats.users}`, 'blue');
    log(`   ├─ Wholesalers: ${stats.wholesalers}`, 'green');
    log(`   └─ Retailers: ${stats.retailers}`, 'green');
    log(`   Products: ${stats.products}`, 'blue');
    log(`   Orders: ${stats.orders}`, 'blue');

    log(`\n✅ Ready for load testing!`, 'green');
    log(`\n📝 Test Credentials:`, 'yellow');
    log(`   Email: wholesaler1@wholesale.com | Password: password123`, 'blue');
    log(`   Email: retailer1@retail.com | Password: password123`, 'blue');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupLoadTestData();
}

module.exports = { setupLoadTestData };
