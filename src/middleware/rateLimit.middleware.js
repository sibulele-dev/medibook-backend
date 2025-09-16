const redisClient = require("../utils/redis");

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds
const MAX_LOGIN_ATTEMPTS = 5; // Maximum 5 login attempts per window
const BLOCK_DURATION = 30 * 60; // 30 minutes block duration

// Refresh token rate limiting
const REFRESH_RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds
const MAX_REFRESH_ATTEMPTS = 10; // Maximum 10 refresh attempts per window
const REFRESH_BLOCK_DURATION = 30 * 60; // 30 minutes block duration

async function rateLimitMiddleware(req, res, next) {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const endpoint = req.path;
    
    // Apply rate limiting to login endpoints
    if (endpoint.includes('/login')) {
      const key = `rate_limit:${endpoint}:${clientIP}`;
      const blockKey = `blocked:${endpoint}:${clientIP}`;

      // Check if IP is currently blocked
      const isBlocked = await redisClient.get(blockKey);
      if (isBlocked) {
        return res.status(429).json({
          success: false,
          message: "Too many login attempts. Please try again in 30 minutes.",
        });
      }

      // Get current attempt count
      const attempts = await redisClient.get(key);
      const currentAttempts = attempts ? parseInt(attempts) : 0;

      if (currentAttempts >= MAX_LOGIN_ATTEMPTS) {
        // Block the IP for 30 minutes
        await redisClient.set(blockKey, "blocked", { EX: BLOCK_DURATION });
        
        return res.status(429).json({
          success: false,
          message: "Too many login attempts. Please try again in 30 minutes.",
        });
      }

      // Increment attempt count
      await redisClient.set(key, currentAttempts + 1, { EX: RATE_LIMIT_WINDOW });
      
      // Add attempt count to response headers for debugging
      res.setHeader('X-RateLimit-Remaining', MAX_LOGIN_ATTEMPTS - currentAttempts - 1);
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW);
    }

    next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    // If Redis is down, allow the request to proceed
    next();
  }
}

// Rate limiting middleware specifically for refresh token endpoint
async function refreshRateLimitMiddleware(req, res, next) {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const endpoint = req.path;
    
    if (endpoint.includes('/refresh')) {
      const key = `refresh_rate_limit:${endpoint}:${clientIP}`;
      const blockKey = `refresh_blocked:${endpoint}:${clientIP}`;

      // Check if IP is currently blocked
      const isBlocked = await redisClient.get(blockKey);
      if (isBlocked) {
        return res.status(429).json({
          success: false,
          message: "Too many refresh attempts. Please try again in 30 minutes.",
        });
      }

      // Get current attempt count
      const attempts = await redisClient.get(key);
      const currentAttempts = attempts ? parseInt(attempts) : 0;

      if (currentAttempts >= MAX_REFRESH_ATTEMPTS) {
        // Block the IP for 30 minutes
        await redisClient.set(blockKey, "blocked", { EX: REFRESH_BLOCK_DURATION });
        
        return res.status(429).json({
          success: false,
          message: "Too many refresh attempts. Please try again in 30 minutes.",
        });
      }

      // Increment attempt count
      await redisClient.set(key, currentAttempts + 1, { EX: REFRESH_RATE_LIMIT_WINDOW });
      
      // Add attempt count to response headers for debugging
      res.setHeader('X-RefreshRateLimit-Remaining', MAX_REFRESH_ATTEMPTS - currentAttempts - 1);
      res.setHeader('X-RefreshRateLimit-Reset', Math.floor(Date.now() / 1000) + REFRESH_RATE_LIMIT_WINDOW);
    }

    next();
  } catch (error) {
    console.error("Refresh rate limiting error:", error);
    // If Redis is down, allow the request to proceed
    next();
  }
}

// Reset rate limit on successful login
async function resetRateLimit(req, res, next) {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const endpoint = req.path;
    
    if (endpoint.includes('/login')) {
      const key = `rate_limit:${endpoint}:${clientIP}`;
      const blockKey = `blocked:${endpoint}:${clientIP}`;
      
      // Clear rate limit counters on successful login
      await redisClient.del(key);
      await redisClient.del(blockKey);
    }
    
    next();
  } catch (error) {
    console.error("Rate limit reset error:", error);
    next();
  }
}

module.exports = { 
  rateLimitMiddleware, 
  refreshRateLimitMiddleware, 
  resetRateLimit 
}; 