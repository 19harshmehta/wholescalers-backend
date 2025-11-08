require('../setup/testSetup');
// Mock Razorpay SDK to avoid real network calls
const mockCreate = jest.fn(async (opts) => ({ id: 'order_mock123', amount: opts.amount, currency: 'INR' }));
jest.mock('razorpay', () => {
  return function MockRazorpay() {
    return { orders: { create: mockCreate } };
  };
});
const request = require('supertest');
const app = require('../../server');
const { createTestRetailer, createTestWholesaler, getAuthHeaders, createTestOrder } = require('../helpers/testHelpers');
const Invoice = require('../../models/Invoice');
const crypto = require('crypto');


describe('Payments API Integration Tests', () => {
  describe('POST /api/payments/create-order', () => {
    it('should create a Razorpay order for retailer', async () => {
      const retailer = await createTestRetailer();
      const { order, wholesaler } = await createTestOrder();
      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-' + Date.now(),
        amount: order.total,
        issuedTo: retailer._id,
        issuedBy: wholesaler,
        status: 'unpaid'
      });

      const response = await request(app)
        .post('/api/payments/create-order')
        .set(getAuthHeaders(retailer))
        .send({ invoiceId: invoice._id })
        .expect(200);

      expect(response.body.orderId).toBeDefined();
      expect(response.body.amount).toBe(invoice.amount);
      expect(response.body.currency).toBe('INR');
      expect(response.body.keyId).toBe(process.env.RAZORPAY_KEY_ID);
    });

    it('should return 404 for non-existent invoice', async () => {
      const retailer = await createTestRetailer();
      const fakeInvoiceId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .post('/api/payments/create-order')
        .set(getAuthHeaders(retailer))
        .send({ invoiceId: fakeInvoiceId })
        .expect(404);

      expect(response.body.error).toBe('Invoice not found');
    });

    it('should return 403 for invoice belonging to different retailer', async () => {
      const retailer1 = await createTestRetailer();
      const retailer2 = await createTestRetailer();
      const { order, wholesaler } = await createTestOrder({ retailer: retailer1._id });
      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-' + Date.now(),
        amount: order.total,
        issuedTo: retailer1._id,
        issuedBy: wholesaler,
        status: 'unpaid'
      });

      await request(app)
        .post('/api/payments/create-order')
        .set(getAuthHeaders(retailer2))
        .send({ invoiceId: invoice._id })
        .expect(403);
    });
  });

  describe('POST /api/payments/verify-payment', () => {
    it('should verify successful payment', async () => {
      const retailer = await createTestRetailer();
      const { order, wholesaler } = await createTestOrder();
      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-' + Date.now(),
        amount: order.total,
        issuedTo: retailer._id,
        issuedBy: wholesaler,
        status: 'unpaid',
        razorpayOrderId: 'order_mock123'
      });

      const razorpay_payment_id = 'pay_mock123';
      const razorpay_order_id = 'order_mock123';
      
      // Create actual signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const razorpay_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      const response = await request(app)
        .post('/api/payments/verify-payment')
        .set(getAuthHeaders(retailer))
        .send({
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature
        })
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.msg).toBe('Payment verified and successful');

      // Verify invoice was updated
      const updatedInvoice = await Invoice.findById(invoice._id);
      expect(updatedInvoice.status).toBe('paid');
      expect(updatedInvoice.razorpayPaymentId).toBe(razorpay_payment_id);
    });

    it('should return 404 for non-existent invoice', async () => {
      const retailer = await createTestRetailer();
      const response = await request(app)
        .post('/api/payments/verify-payment')
        .set(getAuthHeaders(retailer))
        .send({
          razorpay_payment_id: 'pay_mock123',
          razorpay_order_id: 'non_existent_order',
          razorpay_signature: 'sig'
        })
        .expect(404);

      expect(response.body.error).toBe('Invoice not found for this order');
    });

    it('should return 400 for invalid signature', async () => {
      const retailer = await createTestRetailer();
      const { order, wholesaler } = await createTestOrder();
      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-' + Date.now(),
        amount: order.total,
        issuedTo: retailer._id,
        issuedBy: wholesaler,
        status: 'unpaid',
        razorpayOrderId: 'order_mock123'
      });

      const response = await request(app)
        .post('/api/payments/verify-payment')
        .set(getAuthHeaders(retailer))
        .send({
          razorpay_payment_id: 'pay_mock123',
          razorpay_order_id: 'order_mock123',
          razorpay_signature: 'invalid_signature'
        })
        .expect(400);

      expect(response.body.error).toBe('Payment verification failed');
    });
  });
});