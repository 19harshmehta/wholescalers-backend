require('../../setup/testSetup');
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');
const { register, login, me } = require('../../../controllers/authController');
const { createTestUser } = require('../../helpers/testHelpers');

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      req.body = {
        name: 'John Doe',
        email: `john${Date.now()}@example.com`,
        password: 'password123',
        role: 'retailer',
        company: 'Test Company',
        phone: '1234567890',
      };

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            name: req.body.name,
            email: req.body.email,
            role: req.body.role,
          }),
        })
      );
      
      const user = await User.findOne({ email: req.body.email });
      expect(user).toBeDefined();
      expect(user.password).not.toBe(req.body.password); 
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'test@example.com',
        // Missing name and password
      };

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'name,email,password required' });
    });

    it('should return 400 if email already exists', async () => {
      const existingUser = await createTestUser({ email: 'existing@example.com' });
      
      req.body = {
        name: 'New User',
        email: 'existing@example.com',
        password: 'password123',
      };

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    it('should hash password before saving', async () => {
      req.body = {
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'plainpassword',
      };

      await register(req, res, next);

      const user = await User.findOne({ email: req.body.email });
      const isPasswordHashed = await bcrypt.compare('plainpassword', user.password);
      
      expect(isPasswordHashed).toBe(true);
    });

    it('should handle server errors', async () => {
      // Mock User.create to throw an error
      const createSpy = jest.spyOn(User, 'create').mockRejectedValueOnce(new Error('DB Error'));

      req.body = {
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'password123',
      };

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });

      createSpy.mockRestore();
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await User.create({
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'retailer',
      });

      req.body = {
        email: user.email,
        password: 'password123',
      };

      await login(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response).toHaveProperty('token');
      expect(typeof response.token).toBe('string');
      expect(response).toHaveProperty('user');
      expect(response.user).toHaveProperty('id');
      expect(response.user.id.toString()).toBe(user._id.toString());
      expect(response.user).toHaveProperty('email', user.email);
      expect(response.user).toHaveProperty('role', user.role);
      expect(response.user).toHaveProperty('name');
    });

    it('should return 400 if email or password is missing', async () => {
      req.body = {
        email: 'test@example.com',
        // Missing password
      };

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'email,password required' });
    });

    it('should return 400 if user does not exist', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return 400 if password is incorrect', async () => {
      const user = await createTestUser();

      req.body = {
        email: user.email,
        password: 'wrongpassword',
      };

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return token on successful login', async () => {
      const user = await createTestUser();
      
      req.body = {
        email: user.email,
        password: 'password123',
      };

      await login(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.token).toBeDefined();
      expect(typeof response.token).toBe('string');
    });
  });

  describe('me', () => {
    it('should return current user information', async () => {
      const user = await createTestUser();
      req.user = user;

      await me(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ user });
    });
  });
});

