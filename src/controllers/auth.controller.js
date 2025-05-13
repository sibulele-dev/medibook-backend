/**
 * Authentication Controller
 * Handles user authentication requests (login, registration, password reset)
 */
const authService = require("../services/auth.service");
const userService = require("../services/user.service");
const {
  validateRegistration,
  validateLogin,
  validatePasswordReset,
} = require("../utils/validation");
const logger = require("../utils/logger");

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validateRegistration(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    const { email, password, role, firstName, lastName, practiceId } = req.body;

    // Check if user already exists
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create new user
    const user = await authService.registerUser({
      email,
      password,
      role,
      firstName,
      lastName,
      practiceId,
    });

    // Return token and user info
    const authTokens = await authService.generateAuthTokens(user.id);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens: authTokens,
    });
  } catch (error) {
    logger.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * User login
 */
exports.login = async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validateLogin(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    const { email, password } = req.body;

    // Authenticate user
    const { user, tokens } = await authService.authenticateUser(
      email,
      password
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Return tokens and user info
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        practiceId: user.practiceId,
      },
      tokens,
    });
  } catch (error) {
    logger.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const tokens = await authService.refreshAuth(refreshToken);

    if (!tokens) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      tokens,
    });
  } catch (error) {
    logger.error("Token refresh error:", error);
    return res.status(401).json({
      success: false,
      message: "Failed to refresh token",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Request password reset
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Generate password reset token and send email
    const result = await authService.initiatePasswordReset(email);

    // We always return success even if email doesn't exist for security reasons
    return res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
    });
  } catch (error) {
    logger.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Reset password with token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const validationErrors = validatePasswordReset(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    const result = await authService.resetPassword(token, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Password reset failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    logger.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Password reset failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Invalidate refresh token
      await authService.logoutUser(refreshToken);
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get current user profile
 */
exports.me = async (req, res) => {
  try {
    // User is attached to request by auth middleware
    const userId = req.user.id;

    const user = await userService.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        practiceId: user.practiceId,
      },
    });
  } catch (error) {
    logger.error("Get user profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
