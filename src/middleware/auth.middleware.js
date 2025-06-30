const jwt = require("jsonwebtoken");
const userService = require("../services/user.service");
const redisClient = require("../config/redis");

// Constants for better maintainability
const TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh",
};

const USER_ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
};

const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  CREATED: 201,
  OK: 200,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
};

// Enhanced token generation utility
const generateTokens = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: TOKEN_TYPES.ACCESS,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    issuer: process.env.JWT_ISSUER || "doctors-app",
    audience: process.env.JWT_AUDIENCE || "doctors-app-users",
  });

  // Optional: Generate refresh token with longer expiry
  const refreshPayload = {
    userId: user.id,
    type: TOKEN_TYPES.REFRESH,
  };

  const refreshToken = jwt.sign(
    refreshPayload,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
      issuer: process.env.JWT_ISSUER || "doctors-app",
      audience: process.env.JWT_AUDIENCE || "doctors-app-users",
    }
  );

  return { accessToken, refreshToken };
};

// Enhanced authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from multiple possible sources
    const token = extractToken(req);

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Access token required",
        code: "MISSING_TOKEN",
      });
    }

    // Verify JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable not configured");
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Server configuration error",
        code: "SERVER_CONFIG_ERROR",
      });
    }

    // Verify and decode token with enhanced options
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || "doctors-app",
      audience: process.env.JWT_AUDIENCE || "doctors-app-users",
    });

    // Validate token type
    if (decoded.type && decoded.type !== TOKEN_TYPES.ACCESS) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Invalid token type",
        code: "INVALID_TOKEN_TYPE",
      });
    }

    // Get user from database with error handling
    const user = await userService.getUserById(decoded.userId);

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Enhanced user validation
    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Account is deactivated",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Check if user is suspended/banned
    if (user.status === "suspended") {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Account is suspended",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    // Optional: Check if password was changed after token was issued
    if (
      user.passwordChangedAt &&
      decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Token invalid due to password change",
        code: "TOKEN_INVALIDATED",
      });
    }

    // Add user and token info to request object
    req.user = user;
    req.tokenPayload = decoded;

    // Log successful authentication for audit purposes
    if (process.env.NODE_ENV !== "test") {
      console.log(`User authenticated: ${user.email} (${user.role})`);
    }

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return handleAuthError(error, res);
  }
};

// Token extraction utility
const extractToken = (req) => {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check cookies (for web applications)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  // Check query parameter (less secure, use with caution)
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
};

// Enhanced error handling
const handleAuthError = (error, res) => {
  const errorResponses = {
    JsonWebTokenError: {
      status: HTTP_STATUS.UNAUTHORIZED,
      message: "Invalid token format",
      code: "INVALID_TOKEN",
    },
    TokenExpiredError: {
      status: HTTP_STATUS.UNAUTHORIZED,
      message: "Token has expired",
      code: "TOKEN_EXPIRED",
    },
    NotBeforeError: {
      status: HTTP_STATUS.UNAUTHORIZED,
      message: "Token not active yet",
      code: "TOKEN_NOT_ACTIVE",
    },
  };

  const errorResponse = errorResponses[error.name] || {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: "Authentication failed",
    code: "AUTH_FAILED",
  };

  return res.status(errorResponse.status).json({
    success: false,
    message: errorResponse.message,
    code: errorResponse.code,
    ...(process.env.NODE_ENV === "development" && { details: error.message }),
  });
};

// Enhanced role-based authorization middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const userRole = req.user.role;
    const hasPermission = Array.isArray(allowedRoles)
      ? allowedRoles.includes(userRole)
      : allowedRoles === userRole;

    if (!hasPermission) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: `Access denied. Required role(s): ${
          Array.isArray(allowedRoles) ? allowedRoles.join(", ") : allowedRoles
        }`,
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    next();
  };
};

// Specific role middlewares
const requireAdmin = requireRole(USER_ROLES.ADMIN);
const requireDoctor = requireRole([USER_ROLES.DOCTOR, USER_ROLES.ADMIN]);
const requireDoctorOrAdmin = requireRole([USER_ROLES.DOCTOR, USER_ROLES.ADMIN]);

// Resource ownership middleware
const requireOwnership = (resourceIdParam = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    // Admins can access any resource
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;

    // Check if user owns the resource or if it's their own profile
    if (resourceId && resourceId.toString() !== userId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: "Access denied. You can only access your own resources",
        code: "RESOURCE_ACCESS_DENIED",
      });
    }

    next();
  };
};

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.user ? req.user.id : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (rateLimitMap.has(key)) {
      const requests = rateLimitMap
        .get(key)
        .filter((time) => time > windowStart);
      rateLimitMap.set(key, requests);
    }

    const requests = rateLimitMap.get(key) || [];

    if (requests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    requests.push(now);
    rateLimitMap.set(key, requests);
    next();
  };
};

// Optional middleware for API key authentication (for external services)
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "API key required",
        code: "MISSING_API_KEY",
      });
    }

    // Validate API key (implement your own logic)
    const isValidKey = await validateApiKey(apiKey);

    if (!isValidKey) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Invalid API key",
        code: "INVALID_API_KEY",
      });
    }

    req.apiKey = apiKey;
    next();
  } catch (error) {
    console.error("API key authentication error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Authentication failed",
      code: "AUTH_FAILED",
    });
  }
};

// Placeholder for API key validation
const validateApiKey = async (apiKey) => {
  // Implement your API key validation logic here
  // This could involve database lookup, hashing, etc.
  return false; // Placeholder
};

// Session-based authentication middleware
const authenticateSession = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: "Session token required",
        code: "MISSING_SESSION_TOKEN",
      });
    }
    const userId = await redisClient.get(sessionToken);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
        code: "INVALID_SESSION",
      });
    }
    const user = await userService.getUserById(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
        code: "USER_NOT_FOUND",
      });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Session authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "SESSION_AUTH_ERROR",
    });
  }
};

module.exports = {
  // Core authentication
  authenticateToken,
  generateTokens,
  authenticateSession,

  // Role-based authorization
  requireRole,
  requireAdmin,
  requireDoctor,
  requireDoctorOrAdmin,

  // Resource protection
  requireOwnership,

  // Rate limiting
  rateLimit,

  // API key authentication
  authenticateApiKey,

  // Utilities
  extractToken,
  handleAuthError,

  // Constants
  TOKEN_TYPES,
  USER_ROLES,
  HTTP_STATUS,
};
