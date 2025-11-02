const jwt = require('jsonwebtoken');

exports.signToken = (user) => {
  const payload = { id: user._id, role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET || 'replace_with_secure_secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};
