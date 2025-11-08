require('../setup/testSetup');
const request = require('supertest');
const app = require('../../server');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const { createTestWholesaler, createTestRetailer, getAuthHeaders, createTestProduct } = require('../helpers/testHelpers');

describe('Orders API Integration Tests', () => {
  describe('POST /api/orders', () => {
    it('should create an order for retailer', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100, price: 50 }, wholesaler._id);

      const orderData = {
        wholesalerId: wholesaler._id.toString(),
        items: [
          {
            product: product._id.toString(),
            quantity: 2,
            price: product.price,
          },
        ],
      };

      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeaders(retailer))
        .send(orderData)
        .expect(201);

      expect(response.body.retailer.toString()).toBe(retailer._id.toString());
      expect(response.body.wholesaler.toString()).toBe(wholesaler._id.toString());
      expect(response.body.total).toBe(product.price * 2);
      expect(response.body.status).toBe('pending');

      // Verify stock was reduced
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(98);
    });

    it('should return 400 for insufficient stock', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 5, price: 50 }, wholesaler._id);

      const orderData = {
        wholesalerId: wholesaler._id.toString(),
        items: [
          {
            product: product._id.toString(),
            quantity: 10,
            price: product.price,
          },
        ],
      };

      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeaders(retailer))
        .send(orderData)
        .expect(400);

      expect(response.body.error).toContain('Insufficient stock');
    });

    it('should return 400 for missing required fields', async () => {
      const retailer = await createTestRetailer();

      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeaders(retailer))
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/orders', () => {
    it('should list orders for retailer', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      // Create an order
      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });

      const response = await request(app)
        .get('/api/orders')
        .set(getAuthHeaders(retailer))
        .expect(200);

      expect(response.body.count).toBeGreaterThanOrEqual(1);
      expect(response.body.orders.some(o => o._id === order._id.toString())).toBe(true);
    });

    it('should list orders for wholesaler', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });

      const response = await request(app)
        .get('/api/orders')
        .set(getAuthHeaders(wholesaler))
        .expect(200);

      expect(response.body.orders.some(o => o._id === order._id.toString())).toBe(true);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should get order details for retailer', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set(getAuthHeaders(retailer))
        .expect(200);

      expect(response.body._id).toBe(order._id.toString());
    });

    it('should return 403 for unauthorized access', async () => {
      const retailer1 = await createTestRetailer();
      const retailer2 = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      const order = await Order.create({
        retailer: retailer1._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set(getAuthHeaders(retailer2))
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status for wholesaler', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
        status: 'pending',
      });

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set(getAuthHeaders(wholesaler))
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.status).toBe('confirmed');
    });

    it('should return 403 for non-wholesaler', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({ stock: 100 }, wholesaler._id);

      const order = await Order.create({
        retailer: retailer._id,
        wholesaler: wholesaler._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        total: product.price,
      });

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set(getAuthHeaders(retailer))
        .send({ status: 'confirmed' })
        .expect(403);

      expect(response.body.error).toBe('Forbidden - insufficient role');
    });
  });
});

