const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const {
  validateLogin,
  validateRegister,
  validatePasswordReset,
} = require("../middleware/validation.middleware");

/**
 * @route POST /api/auth/register
 * @desc Register a new user (patient, doctor, staff, admin)
 * @access Public
 */
router.post("/register", validateRegister, authController.register);

/**
 * @route POST /api/auth/login
 * @desc Login user and receive JWT token
 * @access Public
 */
router.post("/login", validateLogin, authController.login);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh JWT token
 * @access Public (with refresh token)
 */
router.post("/refresh-token", authController.refreshToken);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset email
 * @access Public
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public (with reset token)
 */
router.post(
  "/reset-password",
  validatePasswordReset,
  authController.resetPassword
);

/**
 * @route POST /api/auth/verify-email
 * @desc Verify user email with token
 * @access Public (with verification token)
 */
router.post("/verify-email", authController.verifyEmail);

/**
 * @route POST /api/auth/logout
 * @desc Invalidate refresh token
 * @access Private
 */
router.post("/logout", authController.logout);

module.exports = router;
