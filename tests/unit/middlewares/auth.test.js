require('../../setup/testSetup');
const { authenticate, authorize } = require('../../../middlewares/auth');
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const { createTestUser, createTestRetailer, createTestWholesaler } = require('../../helpers/testHelpers');

describe('Auth Middleware', () => {
  describe('authenticate', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      next = jest.fn();
    });

    it('should return 401 if no token is provided', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid_token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid token' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not found', async () => {
      const token = jwt.sign(
        { id: '507f1f77bcf86cd799439011', role: 'retailer' },
        process.env.JWT_SECRET
      );
      req.headers.authorization = `Bearer ${token}`;

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should authenticate valid user and attach to req.user', async () => {
      const user = await createTestRetailer();
      const token = jwt.sign(
        { id: user._id.toString(), role: user.role },
        process.env.JWT_SECRET
      );
      req.headers.authorization = `Bearer ${token}`;

      await authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(user._id.toString());
      expect(req.user.email).toBe(user.email);
      expect(req.user.password).toBeUndefined(); // Password should be excluded
      expect(next).toHaveBeenCalled();
    });

    it('should handle Bearer token format correctly', async () => {
      const user = await createTestRetailer();
      const token = jwt.sign(
        { id: user._id.toString(), role: user.role },
        process.env.JWT_SECRET
      );
      req.headers.authorization = `Bearer ${token}`;

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    let req, res, next;

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      next = jest.fn();
    });

    it('should return 401 if user is not authenticated', () => {
      const middleware = authorize(['wholesaler']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not authorized', async () => {
      const retailer = await createTestRetailer();
      req.user = retailer;

      const middleware = authorize(['wholesaler']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden - insufficient role' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access if user role is authorized', async () => {
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;

      const middleware = authorize(['wholesaler']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access if user has one of the authorized roles', async () => {
      const admin = await createTestUser({ role: 'admin' });
      req.user = admin;

      const middleware = authorize(['admin', 'wholesaler']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle string role parameter', async () => {
      const wholesaler = await createTestWholesaler();
      req.user = wholesaler;

      const middleware = authorize('wholesaler');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access if no roles specified (any authenticated user)', async () => {
      const retailer = await createTestRetailer();
      req.user = retailer;

      const middleware = authorize([]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

