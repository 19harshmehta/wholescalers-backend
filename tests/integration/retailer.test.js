require('../setup/testSetup');
const request = require('supertest');
const app = require('../../server');
const { createTestRetailer, createTestWholesaler, getAuthHeaders, createTestProduct, createTestOrder } = require('../helpers/testHelpers');

describe('Retailer API Integration Tests', () => {
  describe('GET /api/retailerDashboard/overview', () => {
    it('should get retailer overview with recent orders', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100, price: 50 }, wholesaler._id);

      // Create multiple orders
      await createTestOrder({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });
      await createTestOrder({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });
      await createTestOrder({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });

      const response = await request(app)
        .get('/api/retailerDashboard/overview')
        .set(getAuthHeaders(retailer))
        .expect(200);

      expect(response.body.ordersCount).toBeGreaterThanOrEqual(3);
      expect(response.body.recentOrders).toBeInstanceOf(Array);
      expect(response.body.recentOrders.length).toBeLessThanOrEqual(10); // Should limit to 10 recent orders
    });

    it('should return 403 for non-retailer users', async () => {
      const wholesaler = await createTestWholesaler();

      await request(app)
        .get('/api/retailerDashboard/overview')
        .set(getAuthHeaders(wholesaler))
        .expect(403);
    });

    it('should return empty orders for new retailer', async () => {
      const retailer = await createTestRetailer();

      const response = await request(app)
        .get('/api/retailerDashboard/overview')
        .set(getAuthHeaders(retailer))
        .expect(200);

      expect(response.body.ordersCount).toBe(0);
      expect(response.body.recentOrders).toHaveLength(0);
    });

    it('should sort recent orders by creation date', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100, price: 50 }, wholesaler._id);

      // Create orders with different dates
      await createTestOrder({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });
      await createTestOrder({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });

      const response = await request(app)
        .get('/api/retailerDashboard/overview')
        .set(getAuthHeaders(retailer))
        .expect(200);

      const first = new Date(response.body.recentOrders[0].createdAt).getTime();
      const second = new Date(response.body.recentOrders[1].createdAt).getTime();
      expect(first).toBeGreaterThan(second);
    });
  });
});