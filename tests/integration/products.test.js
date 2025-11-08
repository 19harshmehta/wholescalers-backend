require('../setup/testSetup');
const request = require('supertest');
const app = require('../../server');
const Product = require('../../models/Product');
const { createTestWholesaler, createTestRetailer, getAuthHeaders, createTestProduct } = require('../helpers/testHelpers');

describe('Products API Integration Tests', () => {
  describe('GET /api/products', () => {
    it('should list all products for retailer', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      await createTestProduct({ name: 'Product 1' }, wholesaler._id);
      await createTestProduct({ name: 'Product 2' }, wholesaler._id);

      const response = await request(app)
        .get('/api/products')
        .set(getAuthHeaders(retailer))
        .expect(200);

      expect(response.body.count).toBeGreaterThanOrEqual(2);
      expect(response.body.products).toBeInstanceOf(Array);
    });

    it('should list only wholesaler products for wholesaler', async () => {
      const wholesaler1 = await createTestWholesaler();
      const wholesaler2 = await createTestWholesaler();
      await createTestProduct({ name: 'Product 1' }, wholesaler1._id);
      await createTestProduct({ name: 'Product 2' }, wholesaler2._id);

      const response = await request(app)
        .get('/api/products')
        .set(getAuthHeaders(wholesaler1))
        .expect(200);

      expect(response.body.products.every(p => p.wholesaler.toString() === wholesaler1._id.toString())).toBe(true);
    });

    it('should filter products by category', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      await createTestProduct({ name: 'Electronics Product', category: 'Electronics' }, wholesaler._id);
      await createTestProduct({ name: 'Clothing Product', category: 'Clothing' }, wholesaler._id);

      const response = await request(app)
        .get('/api/products?category=Electronics')
        .set(getAuthHeaders(retailer))
        .expect(200);

      expect(response.body.products.every(p => p.category === 'Electronics')).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('POST /api/products', () => {
    it('should create a product for wholesaler', async () => {
      const wholesaler = await createTestWholesaler();
      const productData = {
        name: 'New Product',
        category: 'Electronics',
        sku: 'SKU-123',
        description: 'Test product',
        price: 99.99,
        stock: 100,
      };

      const response = await request(app)
        .post('/api/products')
        .set(getAuthHeaders(wholesaler))
        .send(productData)
        .expect(201);

      expect(response.body.name).toBe(productData.name);
      expect(response.body.wholesaler.toString()).toBe(wholesaler._id.toString());
    });

    it('should return 403 for non-wholesaler', async () => {
      const retailer = await createTestRetailer();
      const productData = {
        name: 'New Product',
        price: 99.99,
      };

      const response = await request(app)
        .post('/api/products')
        .set(getAuthHeaders(retailer))
        .send(productData)
        .expect(403);

      expect(response.body.error).toBe('Forbidden - insufficient role');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({ name: 'Product', price: 100 })
        .expect(401);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get a single product', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({}, wholesaler._id);

      const response = await request(app)
        .get(`/api/products/${product._id}`)
        .set(getAuthHeaders(retailer))
        .expect(200);

      expect(response.body._id).toBe(product._id.toString());
      expect(response.body.name).toBe(product.name);
    });

    it('should return 404 for non-existent product', async () => {
      const retailer = await createTestRetailer();
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .set(getAuthHeaders(retailer))
        .expect(404);

      expect(response.body.error).toBe('Not found');
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product', async () => {
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({}, wholesaler._id);

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .set(getAuthHeaders(wholesaler))
        .send({ name: 'Updated Product', price: 150 })
        .expect(200);

      expect(response.body.name).toBe('Updated Product');
      expect(response.body.price).toBe(150);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product', async () => {
      const wholesaler = await createTestWholesaler();
      const product = await createTestProduct({}, wholesaler._id);

      await request(app)
        .delete(`/api/products/${product._id}`)
        .set(getAuthHeaders(wholesaler))
        .expect(200);

      const deletedProduct = await Product.findById(product._id);
      expect(deletedProduct).toBeNull();
    });
  });
});

