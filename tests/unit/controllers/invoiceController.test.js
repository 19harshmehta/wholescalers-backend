require('../../setup/testSetup');
const Invoice = require('../../../models/Invoice');
const Order = require('../../../models/Order');
const { createForOrder, get, listForRetailer, listForWholesaler } = require('../../../controllers/invoiceController');
const { createTestWholesaler, createTestRetailer } = require('../../helpers/testHelpers');

describe('Invoice Controller', () => {
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

  describe('createForOrder', () => {
    it('should create invoice for order successfully', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });

      req.user = wholesaler;
      req.params.orderId = order._id.toString();

      await createForOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.order.toString()).toBe(order._id.toString());
      expect(response.amount).toBe(100);
      expect(response.issuedTo.toString()).toBe(retailer._id.toString());
      expect(response.issuedBy.toString()).toBe(wholesaler._id.toString());
      expect(response.invoiceNumber).toContain('INV-');

      // Verify invoice was created in database
      const invoice = await Invoice.findById(response._id);
      expect(invoice).toBeDefined();
    });

    it('should return 404 if order not found', async () => {
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;
      req.params.orderId = '507f1f77bcf86cd799439011';

      await createForOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Order not found' });
    });

    it('should return 403 if user is not order wholesaler', async () => {
      const retailer = await createTestRetailer();
      const wholesaler1 = await createTestWholesaler();
      const wholesaler2 = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler1._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });

      req.user = wholesaler2;
      req.params.orderId = order._id.toString();

      await createForOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });
  });

  describe('get', () => {
    it('should get invoice for retailer', async () => {
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
      });

      req.user = retailer;
      req.params.id = invoice._id.toString();

      await get(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response._id.toString()).toBe(invoice._id.toString());
    });

    it('should get invoice for wholesaler', async () => {
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
      });

      req.user = wholesaler;
      req.params.id = invoice._id.toString();

      await get(req, res, next);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 if invoice not found', async () => {
      const retailer = await createTestRetailer();
      req.user = retailer;
      req.params.id = '507f1f77bcf86cd799439011';

      await get(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    it('should return 403 if user is not related to invoice', async () => {
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
      });

      req.user = retailer2;
      req.params.id = invoice._id.toString();

      await get(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });
  });

  describe('listForRetailer', () => {
    it('should list invoices for retailer', async () => {
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
      });

      req.user = retailer;

      await listForRetailer(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.count).toBeGreaterThanOrEqual(1);
      expect(response.invoices.some(inv => inv._id.toString() === invoice._id.toString())).toBe(true);
    });

    it('should return empty array if no invoices', async () => {
      const retailer = await createTestRetailer();
      req.user = retailer;

      await listForRetailer(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ count: 0, invoices: [] });
    });
  });

  describe('listForWholesaler', () => {
    it('should list invoices for wholesaler', async () => {
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
      });

      req.user = wholesaler;

      await listForWholesaler(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.count).toBeGreaterThanOrEqual(1);
      expect(response.invoices.some(inv => inv._id.toString() === invoice._id.toString())).toBe(true);
    });

    it('should return empty array if no invoices', async () => {
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;

      await listForWholesaler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ count: 0, invoices: [] });
    });
  });
});

