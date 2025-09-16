const crypto = require('crypto');

// Security headers middleware
function securityHeadersMiddleware(req, res, next) {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none';"
  );

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  next();
}

// CSRF protection middleware
function csrfProtectionMiddleware(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API endpoints that don't need it (like refresh token)
  if (req.path.includes('/refresh') || req.path.includes('/login')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
}

// Token fingerprinting middleware
function tokenFingerprintMiddleware(req, res, next) {
  // Generate fingerprint from IP and User-Agent
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';
  
  const fingerprint = crypto
    .createHash('sha256')
    .update(ip + userAgent)
    .digest('hex');

  req.fingerprint = fingerprint;
  next();
}

// Request validation middleware
function requestValidationMiddleware(req, res, next) {
  // Validate request size
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large',
      code: 'REQUEST_TOO_LARGE'
    });
  }

  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        message: 'Unsupported media type',
        code: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }
  }

  next();
}

// Rate limiting headers middleware
function rateLimitHeadersMiddleware(req, res, next) {
  // Add rate limit headers to all responses
  res.setHeader('X-RateLimit-Policy', 'sliding-window');
  res.setHeader('X-RateLimit-Window', '900'); // 15 minutes in seconds
  
  next();
}

module.exports = {
  securityHeadersMiddleware,
  csrfProtectionMiddleware,
  tokenFingerprintMiddleware,
  requestValidationMiddleware,
  rateLimitHeadersMiddleware
};
