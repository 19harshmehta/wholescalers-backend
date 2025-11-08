require('../setup/testSetup');
const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const { createTestUser, getAuthHeaders } = require('../helpers/testHelpers');

describe('Auth API Integration Tests', () => {

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Anuj Shah',
        email: `anuj${Date.now()}@example.com`,
        password: 'password123',
        role: 'retailer',
        company: 'Test Company',
        phone: '1234567890',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe(userData.role);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.error).toBe('name,email,password required');
    });

    it('should return 400 for duplicate email', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: user.email,
          password: 'password123',
        })
        .expect(400);

      expect(response.body.error).toBe('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123',
        })
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(user.email);
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.error).toBe('email,password required');
    });

    it('should return 400 for invalid credentials', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'wrongpassword',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .get('/api/auth/me')
        .set(getAuthHeaders(user))
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user._id).toBe(user._id.toString());
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return success for logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });
});

