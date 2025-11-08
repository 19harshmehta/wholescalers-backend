require('../../setup/testSetup');
const { signToken } = require('../../../utils/jwt');
const jwt = require('jsonwebtoken');

describe('JWT Utility', () => {

  describe('signToken', () => {
    it('should create a valid JWT token', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        role: 'retailer',
      };
      
      const token = signToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include user id and role in token payload', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        role: 'wholesaler',
      };
      
      const token = signToken(user);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.id).toBe(user._id);
      expect(decoded.role).toBe(user.role);
    });


    it('should include iat/exp claims', () => {
      const user = { _id: '507f1f77bcf86cd799439011', role: 'retailer' };
      const token = signToken(user);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should handle different user roles', () => {
      const roles = ['retailer', 'wholesaler', 'admin'];
      
      roles.forEach(role => {
        const user = {
          _id: '507f1f77bcf86cd799439011',
          role,
        };
        
        const token = signToken(user);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        expect(decoded.role).toBe(role);
      });
    });
  });
});

