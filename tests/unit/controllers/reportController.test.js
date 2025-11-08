require('../../setup/testSetup');
const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const { sales, inventory, customers } = require('../../../controllers/reportController');
const { createTestWholesaler, createTestRetailer } = require('../../helpers/testHelpers');

describe('Report Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('sales', () => {
    it('should calculate total sales correctly', async () => {
      const wholesaler = await createTestWholesaler();
      const retailer = await createTestRetailer();

      await Order.create([
        {
          retailer: retailer._id,
          wholesaler: wholesaler._id,
          items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
          total: 100,
        },
        {
          retailer: retailer._id,
          wholesaler: wholesaler._id,
          items: [{ product: '507f1f77bcf86cd799439012', quantity: 2, price: 50 }],
          total: 100,
        },
      ]);

      req.query = {};

      await sales(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.totalOrders).toBe(2);
      expect(response.totalSales).toBe(200);
    });

    it('should filter sales by wholesaler query parameter', async () => {
      const wholesaler1 = await createTestWholesaler();
      const wholesaler2 = await createTestWholesaler();
      const retailer = await createTestRetailer();

      await Order.create([
        {
          retailer: retailer._id,
          wholesaler: wholesaler1._id,
          items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
          total: 100,
        },
        {
          retailer: retailer._id,
          wholesaler: wholesaler2._id,
          items: [{ product: '507f1f77bcf86cd799439012', quantity: 1, price: 200 }],
          total: 200,
        },
      ]);

      req.query = { wholesaler: wholesaler1._id.toString() };

      await sales(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.totalOrders).toBe(1);
      expect(response.totalSales).toBe(100);
    });

    it('should return zero sales if no orders', async () => {
      req.query = {};

      await sales(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ totalOrders: 0, totalSales: 0 });
    });

    it('should return sales summary (totalOrders and totalSales)', async () => {
      const wholesaler = await createTestWholesaler();
      const retailer = await createTestRetailer();

      await Order.create([
        {
          retailer: retailer._id,
          wholesaler: wholesaler._id,
          items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
          total: 100,
        },
        {
          retailer: retailer._id,
          wholesaler: wholesaler._id,
          items: [{ product: '507f1f77bcf86cd799439012', quantity: 2, price: 50 }],
          total: 100,
        },
      ]);

      req.query = {};

      await sales(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response).toEqual(expect.objectContaining({ totalOrders: 2, totalSales: 200 }));
    });
  });

  describe('inventory', () => {
    it('should return all products for wholesaler', async () => {
      const wholesaler = await createTestWholesaler();

      await Product.create([
        { name: 'Product 1', price: 100, stock: 50, wholesaler: wholesaler._id },
        { name: 'Product 2', price: 200, stock: 30, wholesaler: wholesaler._id },
      ]);

      req.query = {};

      await inventory(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.count).toBeGreaterThanOrEqual(2);
      expect(response.products).toBeInstanceOf(Array);
    });

    it('should filter products by wholesaler query parameter', async () => {
      const wholesaler1 = await createTestWholesaler();
      const wholesaler2 = await createTestWholesaler();

      await Product.create([
        { name: 'Product 1', price: 100, stock: 50, wholesaler: wholesaler1._id },
        { name: 'Product 2', price: 200, stock: 30, wholesaler: wholesaler2._id },
      ]);

      req.query = { wholesaler: wholesaler1._id.toString() };

      await inventory(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.count).toBe(1);
      expect(response.products[0].wholesaler.toString()).toBe(wholesaler1._id.toString());
    });

    it('should return empty array if no products', async () => {
      req.query = {};

      await inventory(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ count: 0, products: [] });
    });
  });

  describe('customers', () => {
    it('should return unique customers for wholesaler', async () => {
      const wholesaler = await createTestWholesaler();
      const retailer1 = await createTestRetailer();
      const retailer2 = await createTestRetailer();

      await Order.create([
        {
          retailer: retailer1._id,
          wholesaler: wholesaler._id,
          items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
          total: 100,
        },
        {
          retailer: retailer1._id,
          wholesaler: wholesaler._id,
          items: [{ product: '507f1f77bcf86cd799439012', quantity: 1, price: 100 }],
          total: 100,
        },
        {
          retailer: retailer2._id,
          wholesaler: wholesaler._id,
          items: [{ product: '507f1f77bcf86cd799439013', quantity: 1, price: 100 }],
          total: 100,
        },
      ]);

      req.user = wholesaler;
      req.query = {};

      await customers(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.count).toBe(2); // Should be unique retailers
      expect(response.customers).toBeInstanceOf(Array);
      expect(response.customers.length).toBe(2);
    });

    it('should filter by wholesaler query parameter', async () => {
      const wholesaler1 = await createTestWholesaler();
      const wholesaler2 = await createTestWholesaler();
      const retailer = await createTestRetailer();

      await Order.create([
        {
          retailer: retailer._id,
          wholesaler: wholesaler1._id,
          items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
          total: 100,
        },
        {
          retailer: retailer._id,
          wholesaler: wholesaler2._id,
          items: [{ product: '507f1f77bcf86cd799439012', quantity: 1, price: 100 }],
          total: 100,
        },
      ]);

      req.user = wholesaler1;
      req.query = { wholesaler: wholesaler1._id.toString() };

      await customers(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.count).toBe(1);
    });

    it('should use req.user._id if wholesaler not in query', async () => {
      const wholesaler = await createTestWholesaler();
      const retailer = await createTestRetailer();

      await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 1, price: 100 }],
        total: 100,
      });

      req.user = wholesaler;
      req.query = {};

      await customers(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.count).toBe(1);
    });

    it('should return empty array if no customers', async () => {
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;
      req.query = {};

      await customers(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ count: 0, customers: [] });
    });
  });
});

