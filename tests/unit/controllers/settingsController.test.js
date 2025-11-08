require('../../setup/testSetup');
const User = require('../../../models/User');
const bcrypt = require('bcryptjs');
const { getProfile, updateProfile, changePassword } = require('../../../controllers/settingsController');
const { createTestUser } = require('../../helpers/testHelpers');

describe('Settings Controller', () => {
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

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const user = await createTestUser();
      req.user = user;

      await getProfile(req, res, next);

      expect(res.json).toHaveBeenCalledWith(user);
    });

    it('should return user without password field', async () => {
      const user = await createTestUser();
      req.user = user.toObject();
      delete req.user.password;

      await getProfile(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.password).toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const user = await createTestUser();
      req.user = user;
      req.body = {
        name: 'Updated Name',
        company: 'Updated Company',
        phone: '9876543210',
      };

      await updateProfile(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.name).toBe('Updated Name');
      expect(response.company).toBe('Updated Company');
      expect(response.phone).toBe('9876543210');
      expect(response.password).toBeUndefined();

      // Verify update in database
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toBe('Updated Name');
    });

    it('should update only provided fields', async () => {
      const user = await createTestUser();
      const originalEmail = user.email;
      req.user = user;
      req.body = {
        name: 'New Name',
      };

      await updateProfile(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.name).toBe('New Name');
      expect(response.email).toBe(originalEmail);
    });

    it('should not update password field through profile update', async () => {
      const user = await createTestUser();
      const originalPassword = user.password;
      req.user = user;
      req.body = {
        name: 'New Name',
        password: 'newpassword',
      };

      await updateProfile(req, res, next);

      // Verify password was not changed
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.password).toBe(originalPassword);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully with valid old password', async () => {
      const user = await createTestUser();
      req.user = user;
      req.body = {
        oldPassword: 'password123',
        newPassword: 'newpassword123',
      };

      await changePassword(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ ok: true, msg: 'Password changed' });

      // Verify password was changed
      const updatedUser = await User.findById(user._id);
      const isNewPasswordValid = await bcrypt.compare('newpassword123', updatedUser.password);
      expect(isNewPasswordValid).toBe(true);
    });

    it('should return 400 if old password is incorrect', async () => {
      const user = await createTestUser();
      req.user = user;
      req.body = {
        oldPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      await changePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Old password incorrect' });

      // Verify password was not changed
      const updatedUser = await User.findById(user._id);
      const isOldPasswordValid = await bcrypt.compare('password123', updatedUser.password);
      expect(isOldPasswordValid).toBe(true);
    });

    it('should return 400 if oldPassword is missing', async () => {
      const user = await createTestUser();
      req.user = user;
      req.body = {
        newPassword: 'newpassword123',
      };

      await changePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'oldPassword and newPassword required' });
    });

    it('should return 400 if newPassword is missing', async () => {
      const user = await createTestUser();
      req.user = user;
      req.body = {
        oldPassword: 'password123',
      };

      await changePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'oldPassword and newPassword required' });
    });

    it('should hash new password before saving', async () => {
      const user = await createTestUser();
      req.user = user;
      req.body = {
        oldPassword: 'password123',
        newPassword: 'newpassword123',
      };

      await changePassword(req, res, next);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.password).not.toBe('newpassword123');
      expect(updatedUser.password.length).toBeGreaterThan(20); 
    });
  });
});

