require('../setup/testSetup');
const request = require('supertest');
const app = require('../../server');
const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const ic = require('../../controllers/invoiceController');
const Order = require('../../models/Order');
const Invoice = require('../../models/Invoice');
const { 
  createTestWholesaler, 
  createTestRetailer, 
  getAuthHeaders, 
  createTestProduct 
} = require('../helpers/testHelpers');

describe('Invoices API Integration Tests', () => {
  // Local test-only app to expose wholesaler route without "/:id" conflict
  const testApp = express();
  testApp.use(express.json());
  const testRouter = express.Router();
  testRouter.get('/wholesaler', authenticate, authorize('wholesaler'), ic.listForWholesaler);
  testApp.use('/api/invoices-test', testRouter);
  describe('POST /api/invoices/order/:orderId', () => {
    it('should create an invoice for an order as wholesaler', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100, price: 50 }, wholesaler._id);

      // Create an order first
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 2, price: product.price }],
        total: product.price * 2,
        status: 'confirmed'
      });

      const response = await request(app)
        .post(`/api/invoices/order/${order._id}`)
        .set(getAuthHeaders(wholesaler))
        .expect(201);

      expect(response.body.order.toString()).toBe(order._id.toString());
      expect(response.body.amount).toBe(order.total);
      expect(response.body.status).toBe('unpaid');
      expect(response.body.invoiceNumber).toBeDefined();
    });

    it('should return 403 for non-wholesaler users', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price
      });

      await request(app)
        .post(`/api/invoices/order/${order._id}`)
        .set(getAuthHeaders(retailer))
        .expect(403);
    });

    it('should return 404 for non-existent order', async () => {
      const wholesaler = await createTestWholesaler();
      const fakeOrderId = '507f1f77bcf86cd799439011';

      await request(app)
        .post(`/api/invoices/order/${fakeOrderId}`)
        .set(getAuthHeaders(wholesaler))
        .expect(404);
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('should get invoice details for authorized user', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price
      });

      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-' + Date.now(),
        issuedTo: retailer._id,
        issuedBy: wholesaler._id,
        amount: order.total,
        status: 'unpaid'
      });

      const response = await request(app)
        .get(`/api/invoices/${invoice._id}`)
        .set(getAuthHeaders(retailer))
        .expect(200);

      expect(response.body._id).toBe(invoice._id.toString());
      expect(response.body.amount).toBe(invoice.amount);
    });

    it('should return 404 for non-existent invoice', async () => {
      const retailer = await createTestRetailer();
      const fakeInvoiceId = '507f1f77bcf86cd799439011';

      await request(app)
        .get(`/api/invoices/${fakeInvoiceId}`)
        .set(getAuthHeaders(retailer))
        .expect(404);
    });
  });

  describe('GET /api/invoices', () => {
    it('should list invoices for retailer', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price
      });

      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-' + Date.now(),
        issuedTo: retailer._id,
        issuedBy: wholesaler._id,
        amount: order.total,
        status: 'unpaid'
      });

      const response = await request(app)
        .get('/api/invoices')
        .set(getAuthHeaders(retailer))
        .expect(200);

      expect(response.body.invoices).toBeInstanceOf(Array);
      expect(response.body.invoices.some(i => i._id === invoice._id.toString())).toBe(true);
    });

    it('should return 403 for non-retailer users', async () => {
      const wholesaler = await createTestWholesaler();

      await request(app)
        .get('/api/invoices')
        .set(getAuthHeaders(wholesaler))
        .expect(403);
    });
  });

  describe('GET /api/invoices/wholesaler', () => {
    it('should list invoices for wholesaler', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price
      });

      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-' + Date.now(),
        issuedTo: retailer._id,
        issuedBy: wholesaler._id,
        amount: order.total,
        status: 'unpaid'
      });

      const response = await request(testApp)
        .get('/api/invoices-test/wholesaler')
        .set(getAuthHeaders(wholesaler))
        .expect(200);

      expect(response.body.invoices).toBeInstanceOf(Array);
      expect(response.body.invoices.some(i => i._id === invoice._id.toString())).toBe(true);
    });

    it('should return 403 for non-wholesaler users', async () => {
      const retailer = await createTestRetailer();

      await request(testApp)
        .get('/api/invoices-test/wholesaler')
        .set(getAuthHeaders(retailer))
        .expect(403);
    });
  });
});