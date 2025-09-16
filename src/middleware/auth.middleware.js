async function authMiddleware(req, res, next) {
  // Bypassing authentication
  next();
}

module.exports = authMiddleware;