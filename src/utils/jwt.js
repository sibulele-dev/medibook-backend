const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const redisClient = require('./redis');

function generateAccessToken(user, fingerprint = null) {
  const payload = { 
    id: user.id, 
    role: user.role, 
    email: user.email,
    iat: Math.floor(Date.now() / 1000)
  };
  
  // Add fingerprint if provided for token binding
  if (fingerprint) {
    payload.fingerprint = fingerprint;
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
}

async function generateRefreshToken(user) {
  const jti = uuidv4();
  const refreshToken = jwt.sign({ id: user.id, jti }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d', // Standardized to 7 days
  });

  // Store the refresh token's JTI in Redis, associating it with the user ID
  await redisClient.set(jti, user.id.toString(), {
    EX: 7 * 24 * 60 * 60, // 7-day expiry in seconds (standardized)
  });

  // Add the JTI to a set for the user
  await redisClient.sAdd(`user:${user.id}:jtis`, jti);

  return refreshToken;
}

async function deleteAllRefreshTokensForUser(userId) {
  const userJtisKey = `user:${userId}:jtis`;
  let jtis = [];
  try {
    if (typeof redisClient.sMembers === 'function') {
      jtis = await redisClient.sMembers(userJtisKey);
    } else if (typeof redisClient.smembers === 'function') {
      jtis = await redisClient.smembers(userJtisKey);
    }
  } catch (_) {
    jtis = [];
  }

  if (jtis && jtis.length > 0) {
    try {
      await redisClient.del(jtis);
    } catch (_) {}
    try {
      await redisClient.del(userJtisKey);
    } catch (_) {}
  }
}

// Session management functions
async function trackUserSession(userId, ip, userAgent, sessionData = {}) {
  const sessionId = uuidv4();
  const sessionKey = `session:${sessionId}`;
  
  const sessionInfo = {
    userId,
    ip,
    userAgent,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ...sessionData
  };
  
  // Store session in Redis
  await redisClient.hset(sessionKey, sessionInfo);
  await redisClient.expire(sessionKey, 7 * 24 * 60 * 60); // 7 days
  
  // Add session to user's active sessions
  await redisClient.sadd(`user:${userId}:sessions`, sessionId);
  
  return sessionId;
}

async function updateSessionActivity(sessionId) {
  const sessionKey = `session:${sessionId}`;
  await redisClient.hset(sessionKey, 'lastActivity', Date.now());
}

async function revokeSession(sessionId) {
  const sessionKey = `session:${sessionId}`;
  const sessionData = await redisClient.hgetall(sessionKey);
  
  if (sessionData && sessionData.userId) {
    // Remove from user's active sessions
    await redisClient.srem(`user:${sessionData.userId}:sessions`, sessionId);
  }
  
  // Delete the session
  await redisClient.del(sessionKey);
}

async function revokeAllUserSessions(userId) {
  const userSessionsKey = `user:${userId}:sessions`;
  const sessions = await redisClient.smembers(userSessionsKey);
  
  if (sessions && sessions.length > 0) {
    const pipeline = redisClient.pipeline();
    sessions.forEach(sessionId => {
      pipeline.del(`session:${sessionId}`);
    });
    pipeline.del(userSessionsKey);
    await pipeline.exec();
  }
}

// Token rotation with proper security
async function rotateRefreshToken(oldJti, userId, fingerprint = null) {
  // Delete old token
  await redisClient.del(oldJti);
  
  // Generate new token with new JTI
  const newJti = uuidv4();
  const newToken = jwt.sign({ 
    id: userId, 
    jti: newJti,
    iat: Math.floor(Date.now() / 1000)
  }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
  
  // Store new token
  await redisClient.set(newJti, userId.toString(), { EX: 7 * 24 * 60 * 60 });
  
  // Add to user's JTI set
  await redisClient.sadd(`user:${userId}:jtis`, newJti);
  
  return newToken;
}

// Enhanced token validation with fingerprint checking
function validateTokenFingerprint(token, expectedFingerprint) {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.fingerprint && expectedFingerprint) {
      return decoded.fingerprint === expectedFingerprint;
    }
    return true; // Allow if no fingerprint is set
  } catch (error) {
    return false;
  }
}

// Batch token validation for performance
async function validateTokensBatch(tokens) {
  const promises = tokens.map(token => {
    return new Promise((resolve) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        resolve({ valid: true, payload: decoded });
      } catch (error) {
        resolve({ valid: false, error: error.message });
      }
    });
  });
  
  return Promise.all(promises);
}

// Token cache management
const tokenCache = new Map();

function getCachedTokenValidation(token) {
  const cached = tokenCache.get(token);
  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }
  return null;
}

function setCachedTokenValidation(token, result) {
  const decoded = jwt.decode(token);
  if (decoded && decoded.exp) {
    tokenCache.set(token, {
      result,
      expires: decoded.exp * 1000
    });
  }
}

// Clean up expired cache entries
function cleanupTokenCache() {
  const now = Date.now();
  for (const [token, data] of tokenCache.entries()) {
    if (data.expires <= now) {
      tokenCache.delete(token);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupTokenCache, 60 * 60 * 1000);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  deleteAllRefreshTokensForUser,
  trackUserSession,
  updateSessionActivity,
  revokeSession,
  revokeAllUserSessions,
  rotateRefreshToken,
  validateTokenFingerprint,
  validateTokensBatch,
  getCachedTokenValidation,
  setCachedTokenValidation
};
