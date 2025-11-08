require('../setup/testSetup');
const request = require('supertest');
const app = require('../../server');
const { createTestWholesaler, createTestRetailer, getAuthHeaders } = require('../helpers/testHelpers');
const User = require('../../models/User');

describe('Settings API Integration Tests', () => {
  describe('GET /api/settings/profile', () => {
    it('should get user profile', async () => {
      const user = await createTestRetailer();

      const response = await request(app)
        .get('/api/settings/profile')
        .set(getAuthHeaders(user))
        .expect(200);

      expect(response.body.name).toBe(user.name);
      expect(response.body.email).toBe(user.email);
      expect(response.body.company).toBe(user.company);
      expect(response.body.phone).toBe(user.phone);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/settings/profile')
        .expect(401);
    });
  });

  describe('PUT /api/settings/profile', () => {
    it('should update user profile', async () => {
      const user = await createTestRetailer();
      const updates = {
        name: 'Updated Name',
        company: 'Updated Company',
        phone: '9876543210'
      };

      const response = await request(app)
        .put('/api/settings/profile')
        .set(getAuthHeaders(user))
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe(updates.name);
      expect(response.body.company).toBe(updates.company);
      expect(response.body.phone).toBe(updates.phone);

      // Verify database update
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toBe(updates.name);
    });

    it('should allow email update', async () => {
      const user = await createTestRetailer();
      const updates = {
        email: 'newemail@example.com'
      };

      const response = await request(app)
        .put('/api/settings/profile')
        .set(getAuthHeaders(user))
        .send(updates)
        .expect(200);

      expect(response.body.email).toBe(updates.email);
    });

    it('should update phone number without strict format validation', async () => {
      const user = await createTestRetailer();
      const updates = {
        phone: 'invalid-phone'
      };

      const response = await request(app)
        .put('/api/settings/profile')
        .set(getAuthHeaders(user))
        .send(updates)
        .expect(200);

      expect(response.body.phone).toBe(updates.phone);
    });
  });

  describe('PUT /api/settings/password', () => {
    it('should change user password', async () => {
      const user = await createTestRetailer();
      const passwordData = {
        oldPassword: 'password123',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .put('/api/settings/password')
        .set(getAuthHeaders(user))
        .send(passwordData)
        .expect(200);

      expect(response.body.msg).toBeDefined();

      // Verify login with new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: passwordData.newPassword
        })
        .expect(200);

      expect(loginResponse.body.token).toBeDefined();
    });

    it('should return 400 for incorrect current password', async () => {
      const user = await createTestRetailer();
      const passwordData = {
        oldPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .put('/api/settings/password')
        .set(getAuthHeaders(user))
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should allow short new password (no strength validation enforced)', async () => {
      const user = await createTestRetailer();
      const passwordData = {
        oldPassword: 'password123',
        newPassword: '123' // Too short
      };

      const response = await request(app)
        .put('/api/settings/password')
        .set(getAuthHeaders(user))
        .send(passwordData)
        .expect(200);

      expect(response.body.msg).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put('/api/settings/password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        })
        .expect(401);
    });
  });
});