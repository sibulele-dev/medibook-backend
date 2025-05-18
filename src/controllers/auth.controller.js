// src/controllers/authController.js
const authService = require("../services/auth.services");
const { sendTokenCookie } = require("../utils/tokens");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Login controller
 * @route POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide email and password",
    });
  }

  // Login user
  const result = await authService.login(email, password);

  // Check if 2FA is required
  if (result.requiresTwoFactor) {
    return res.status(200).json({
      success: true,
      message: "Two-factor authentication required",
      userId: result.userId,
      requiresTwoFactor: true,
    });
  }

  // Set token cookie
  sendTokenCookie(res, result.token);

  // Send response
  res.status(200).json({
    success: true,
    token: result.token,
    user: result.user,
  });
});

/**
 * Verify 2FA token controller
 * @route POST /api/auth/verify-2fa
 */
exports.verifyTwoFactor = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;

  // Check if userId and token are provided
  if (!userId || !token) {
    return res.status(400).json({
      success: false,
      message: "Please provide user ID and verification code",
    });
  }

  // Verify 2FA token
  const result = await authService.verifyTwoFactor(userId, token);

  // Set token cookie
  sendTokenCookie(res, result.token);

  // Send response
  res.status(200).json({
    success: true,
    token: result.token,
    user: result.user,
  });
});

/**
 * Setup 2FA controller
 * @route POST /api/auth/setup-2fa
 */
exports.setupTwoFactor = asyncHandler(async (req, res) => {
  // Setup 2FA
  const result = await authService.setupTwoFactor(req.user);

  // Send response
  res.status(200).json({
    success: true,
    secret: result.secret,
    qrCode: result.qrCode,
  });
});

/**
 * Enable 2FA controller
 * @route POST /api/auth/enable-2fa
 */
exports.enableTwoFactor = asyncHandler(async (req, res) => {
  const { token } = req.body;

  // Check if token is provided
  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Please provide verification code",
    });
  }

  // Enable 2FA
  await authService.enableTwoFactor(req.user.id, token);

  // Send response
  res.status(200).json({
    success: true,
    message: "Two-factor authentication enabled",
  });
});

/**
 * Forgot password controller
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if email is provided
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Please provide email",
    });
  }

  // Get reset URL
  const resetUrl = `${
    process.env.FRONTEND_URL || "http://localhost:3000"
  }/auth/reset-password`;

  // Send password reset email
  await authService.forgotPassword(email, resetUrl);

  // Send response
  res.status(200).json({
    success: true,
    message: "Password reset email sent",
  });
});

/**
 * Reset password controller
 * @route POST /api/auth/reset-password/:token
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  // Check if password and token are provided
  if (!password || !token) {
    return res.status(400).json({
      success: false,
      message: "Please provide password and token",
    });
  }

  // Reset password
  await authService.resetPassword(token, password);

  // Send response
  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});

/**
 * Logout controller
 * @route GET /api/auth/logout
 */
exports.logout = (req, res) => {
  // Clear token cookie
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  // Send response
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

/**
 * Get current user controller
 * @route GET /api/auth/me
 */
exports.getCurrentUser = asyncHandler(async (req, res) => {
  // Get current user
  const user = await authService.getCurrentUser(req.user.id);

  // Send response
  res.status(200).json({
    success: true,
    user,
  });
});
