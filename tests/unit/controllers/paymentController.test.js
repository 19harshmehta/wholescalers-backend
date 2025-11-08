require('../../setup/testSetup');
const Invoice = require('../../../models/Invoice');
const Order = require('../../../models/Order');
const crypto = require('crypto');
const { createRazorpayOrder, verifyPayment } = require('../../../controllers/paymentController');
const { createTestWholesaler, createTestRetailer } = require('../../helpers/testHelpers');

describe('Payment Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    delete require.cache[require.resolve('../../../controllers/paymentController')];
  });

  describe('createRazorpayOrder', () => {
    it('should return 404 if invoice not found', async () => {
      const retailer = await createTestRetailer();
      req.user = retailer;
      req.body = { invoiceId: '507f1f77bcf86cd799439011' };

      await createRazorpayOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
    });

    it('should return 403 if invoice not owned by user', async () => {
      const retailer1 = await createTestRetailer();
      const retailer2 = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer1._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });
      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-123',
        amount: 100,
        issuedTo: retailer1._id,
        issuedBy: wholesaler._id,
        status: 'unpaid',
      });

      req.user = retailer2;
      req.body = { invoiceId: invoice._id.toString() };

      await createRazorpayOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });

    it('should return 400 if invoice already paid', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });
      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-123',
        amount: 100,
        issuedTo: retailer._id,
        issuedBy: wholesaler._id,
        status: 'paid',
      });

      req.user = retailer;
      req.body = { invoiceId: invoice._id.toString() };

      await createRazorpayOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invoice is already paid' });
    });

    it('should return 500 if payment gateway not configured', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });
      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-123',
        amount: 100,
        issuedTo: retailer._id,
        issuedBy: wholesaler._id,
        status: 'unpaid',
      });

      req.user = retailer;
      req.body = { invoiceId: invoice._id.toString() };

      let run;
      jest.isolateModules(() => {
        jest.doMock('razorpay', () => {
          return function MockRazorpay() {
            return undefined; // simulate constructor producing no instance
          };
        });
        const { createRazorpayOrder: createRazorpayOrderIsolated } = require('../../../controllers/paymentController');
        run = () => createRazorpayOrderIsolated(req, res, next);
      });
      await run();

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
  });

  describe('verifyPayment', () => {
    it('should return 404 if invoice not found for order', async () => {
      req.body = {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'signature',
      };

      await verifyPayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invoice not found for this order' });
    });

    it('should verify valid payment signature', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });
      const invoice = await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-123',
        amount: 100,
        issuedTo: retailer._id,
        issuedBy: wholesaler._id,
        status: 'unpaid',
        razorpayOrderId: 'order_123',
      });

      const razorpay_order_id = 'order_123';
      const razorpay_payment_id = 'pay_123';
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const validSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      req.body = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: validSignature,
      };

      await verifyPayment(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ ok: true, msg: 'Payment verified and successful' });

      // Verify invoice was updated
      const updatedInvoice = await Invoice.findById(invoice._id);
      expect(updatedInvoice.status).toBe('paid');
      expect(updatedInvoice.razorpayPaymentId).toBe(razorpay_payment_id);
    });

    it('should return 400 for invalid payment signature', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });
      await Invoice.create({
        order: order._id,
        invoiceNumber: 'INV-123',
        amount: 100,
        issuedTo: retailer._id,
        issuedBy: wholesaler._id,
        status: 'unpaid',
        razorpayOrderId: 'order_123',
      });

      req.body = {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'invalid_signature',
      };

      await verifyPayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Payment verification failed' });
    });
  });
});

