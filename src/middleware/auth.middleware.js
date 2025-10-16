const jwt = require('jsonwebtoken');
const userService = require('../services/user.service');

async function authMiddleware(req, res, next) {
  // Temporarily disable authentication for development
  // console.warn('Authentication is temporarily disabled. DO NOT USE IN PRODUCTION!');
  // req.user = { id: 'dev_user_id', role: 'admin', email: 'dev@example.com' }; // Mock user for testing
  // next();
  // return;

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await userService.getUserById(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;