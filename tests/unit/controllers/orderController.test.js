require('../../setup/testSetup');
const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const { create, listForUser, get, updateStatus } = require('../../../controllers/orderController');
const { createTestWholesaler, createTestRetailer } = require('../../helpers/testHelpers');

describe('Order Controller', () => {
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

  describe('create', () => {
    it('should create an order successfully', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await Product.create({
        name: 'Test Product',
        price: 100,
        stock: 50,
        wholesaler: wholesaler._id,
      });

      req.user = retailer;
      req.body = {
        wholesalerId: wholesaler._id.toString(),
        items: [
          {
            product: product._id.toString(),
            quantity: 2,
            price: product.price,
          },
        ],
      };

      await create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.retailer.toString()).toBe(retailer._id.toString());
      expect(response.wholesaler.toString()).toBe(wholesaler._id.toString());
      expect(response.total).toBe(product.price * 2);
      expect(response.status).toBe('pending');

      // Verify stock was reduced
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(48);
    });

    it('should return 400 if wholesalerId is missing', async () => {
      const retailer = await createTestRetailer();
      req.user = retailer;
      req.body = {
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1 }],
      };

      await create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'wholesalerId and items required' });
    });

    it('should return 400 if items array is empty', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      req.user = retailer;
      req.body = {
        wholesalerId: wholesaler._id.toString(),
        items: [],
      };

      await create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'wholesalerId and items required' });
    });

    it('should return 400 if product not found', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      req.user = retailer;
      req.body = {
        wholesalerId: wholesaler._id.toString(),
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1 }],
      };

      await create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Product not found');
    });

    it('should return 400 if insufficient stock', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await Product.create({
        name: 'Limited Product',
        price: 100,
        stock: 5,
        wholesaler: wholesaler._id,
      });

      req.user = retailer;
      req.body = {
        wholesalerId: wholesaler._id.toString(),
        items: [
          {
            product: product._id.toString(),
            quantity: 10,
            price: product.price,
          },
        ],
      };

      await create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Insufficient stock');
    });

    it('should handle server errors', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await Product.create({
        name: 'Test Product',
        price: 100,
        stock: 50,
        wholesaler: wholesaler._id,
      });

      req.user = retailer;
      req.body = {
        wholesalerId: wholesaler._id.toString(),
        items: [{ product: product._id.toString(), quantity: 1, price: 100 }],
      };

      // Mock Order.create to throw error
      jest.spyOn(Order, 'create').mockRejectedValueOnce(new Error('DB Error'));

      await create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });

      Order.create.mockRestore();
    });
  });

  describe('listForUser', () => {
    it('should list orders for retailer', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      req.user = retailer;

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });

      await listForUser(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.orders.some(o => o._id.toString() === order._id.toString())).toBe(true);
    });

    it('should list orders for wholesaler', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });

      await listForUser(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.orders.some(o => o._id.toString() === order._id.toString())).toBe(true);
    });

    it('should return empty array if no orders', async () => {
      const retailer = await createTestRetailer();
      req.user = retailer;

      await listForUser(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ count: 0, orders: [] });
    });
  });

  describe('get', () => {
    it('should get order for retailer', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });

      req.user = retailer;
      req.params.id = order._id.toString();

      await get(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response._id.toString()).toBe(order._id.toString());
    });

    it('should get order for wholesaler', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });

      req.user = wholesaler;
      req.params.id = order._id.toString();

      await get(req, res, next);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 if order not found', async () => {
      const retailer = await createTestRetailer();
      req.user = retailer;
      req.params.id = '507f1f77bcf86cd799439011';

      await get(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    it('should return 403 if user is not related to order', async () => {
      const retailer1 = await createTestRetailer();
      const retailer2 = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer1._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });

      req.user = retailer2;
      req.params.id = order._id.toString();

      await get(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });
  });

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
        status: 'pending',
      });

      req.user = wholesaler;
      req.params.id = order._id.toString();
      req.body = { status: 'confirmed' };

      await updateStatus(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe('confirmed');

      // Verify status was updated in database
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('confirmed');
    });

    it('should return 404 if order not found', async () => {
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = { status: 'confirmed' };

      await updateStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    it('should return 403 if user is not order wholesaler', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });

      req.user = retailer;
      req.params.id = order._id.toString();
      req.body = { status: 'confirmed' };

      await updateStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });
  });
});

