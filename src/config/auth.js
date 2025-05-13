/**
 * Authentication Configuration
 *
 * This file contains authentication-related configurations,
 * including JWT settings, password policies, and session management.
 */

// Default values that will be overridden by environment variables
const defaultConfig = {
  // JWT configuration
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production",
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "1h",
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
    issuer: process.env.JWT_ISSUER || "medical-booking-api",
    audience: process.env.JWT_AUDIENCE || "medical-booking-clients",
  },

  // Password policy
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8"),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== "false",
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== "false",
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== "false",
    requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== "false",
    saltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS || "12"),
  },

  // Password reset
  passwordReset: {
    tokenExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY || "3600"), // seconds (1 hour)
    tokenLength: parseInt(process.env.PASSWORD_RESET_TOKEN_LENGTH || "32"),
  },

  // Rate limiting for authentication attempts
  rateLimit: {
    loginAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS || "5"),
    lockoutTime: parseInt(process.env.LOGIN_LOCKOUT_TIME || "900"), // seconds (15 minutes)
    windowMs: parseInt(process.env.LOGIN_WINDOW_MS || "900000"), // milliseconds (15 minutes)
  },

  // 2FA (for future implementation)
  twoFactorAuth: {
    enabled: process.env.ENABLE_2FA === "true",
    issuer: process.env.TFA_ISSUER || "Medical Booking App",
  },

  // Cookie settings (for refresh tokens)
  cookies: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },

  // Access control
  accessControl: {
    defaultPracticeRole: "PATIENT",
  },
};

/**
 * Parse and validate all environment variables related to authentication
 */
function validateEnvironmentVariables() {
  // Check that JWT_SECRET is set in production
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.JWT_SECRET ||
      process.env.JWT_SECRET === defaultConfig.jwt.secret)
  ) {
    console.warn(
      "WARNING: Using default JWT secret in production environment. This is insecure!"
    );
  }

  return {
    ...defaultConfig,
    // Override with any additional environment variable parsing
  };
}

// Export validated configuration
module.exports = validateEnvironmentVariables();
