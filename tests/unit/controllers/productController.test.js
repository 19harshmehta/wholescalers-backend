require('../../setup/testSetup');
const Product = require('../../../models/Product');
const { list, create, get, update, remove } = require('../../../controllers/productController');
const { createTestWholesaler, createTestRetailer } = require('../../helpers/testHelpers');

describe('Product Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('list', () => {
    it('should list all products for retailer', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      req.user = retailer;

      await Product.create([
        { name: 'Product 1', price: 100, stock: 50, wholesaler: wholesaler._id },
        { name: 'Product 2', price: 200, stock: 30, wholesaler: wholesaler._id },
      ]);

      await list(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.count).toBeGreaterThanOrEqual(2);
      expect(response.products).toBeInstanceOf(Array);
    });

    it('should filter products for wholesaler to show only their products', async () => {
      const wholesaler1 = await createTestWholesaler();
      const wholesaler2 = await createTestWholesaler();
      req.user = wholesaler1;

      await Product.create([
        { name: 'Product 1', price: 100, stock: 50, wholesaler: wholesaler1._id },
        { name: 'Product 2', price: 200, stock: 30, wholesaler: wholesaler2._id },
      ]);

      await list(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.products.every(p => p.wholesaler.toString() === wholesaler1._id.toString())).toBe(true);
    });

    it('should filter products by category', async () => {
      const retailer = await createTestRetailer();
      const wholesaler = await createTestWholesaler();
      req.user = retailer;
      req.query.category = 'Electronics';

      await Product.create([
        { name: 'Laptop', price: 1000, stock: 10, category: 'Electronics', wholesaler: wholesaler._id },
        { name: 'T-Shirt', price: 20, stock: 100, category: 'Clothing', wholesaler: wholesaler._id },
      ]);

      await list(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.products.every(p => p.category === 'Electronics')).toBe(true);
    });

    it('should return empty array if no products found', async () => {
      const retailer = await createTestRetailer();
      req.user = retailer;

      await list(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ count: 0, products: [] });
    });
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;
      req.body = {
        name: 'New Product',
        category: 'Electronics',
        sku: 'SKU-123',
        description: 'Test product',
        price: 99.99,
        stock: 100,
      };

      await create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.name).toBe(req.body.name);
      expect(response.wholesaler.toString()).toBe(wholesaler._id.toString());

      // Verify product was created in database
      const product = await Product.findById(response._id);
      expect(product).toBeDefined();
    });

    it('should set wholesaler from req.user', async () => {
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;
      req.body = {
        name: 'Product',
        price: 100,
        stock: 50,
      };

      await create(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.wholesaler.toString()).toBe(wholesaler._id.toString());
    });

    it('should handle database errors', async () => {
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;
      req.body = {
        name: 'Product',
        price: 'invalid', // Invalid type to trigger error
      };

      // Mock Product.create to throw error
      jest.spyOn(Product, 'create').mockRejectedValueOnce(new Error('DB Error'));

      await create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' });

      Product.create.mockRestore();
    });
  });

  describe('get', () => {
    it('should get a single product', async () => {
      const wholesaler = await createTestWholesaler();
      const product = await Product.create({
        name: 'Test Product',
        price: 100,
        stock: 50,
        wholesaler: wholesaler._id,
      });

      req.params.id = product._id.toString();

      await get(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response._id.toString()).toBe(product._id.toString());
      expect(response.name).toBe('Test Product');
    });

    it('should return 404 if product not found', async () => {
      req.params.id = '507f1f77bcf86cd799439011';

      await get(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const wholesaler = await createTestWholesaler();
      const product = await Product.create({
        name: 'Original Product',
        price: 100,
        stock: 50,
        wholesaler: wholesaler._id,
      });

      req.params.id = product._id.toString();
      req.body = {
        name: 'Updated Product',
        price: 150,
      };

      await update(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.name).toBe('Updated Product');
      expect(response.price).toBe(150);

      // Verify update in database
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.name).toBe('Updated Product');
    });

    it('should return 404 if product not found', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = { name: 'Updated' };

      await update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });
  });

  describe('remove', () => {
    it('should delete a product successfully', async () => {
      const wholesaler = await createTestWholesaler();
      const product = await Product.create({
        name: 'Product to Delete',
        price: 100,
        stock: 50,
        wholesaler: wholesaler._id,
      });

      req.params.id = product._id.toString();

      await remove(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ ok: true });

      // Verify product was deleted
      const deletedProduct = await Product.findById(product._id);
      expect(deletedProduct).toBeNull();
    });

    it('should return success even if product does not exist', async () => {
      req.params.id = '507f1f77bcf86cd799439011';

      await remove(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });
});

