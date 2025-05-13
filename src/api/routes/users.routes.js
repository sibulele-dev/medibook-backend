const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { validateUserUpdate } = require("../middleware/validation.middleware");

/**
 * @route GET /api/users/me
 * @desc Get current user profile
 * @access Private
 */
router.get("/me", authMiddleware, userController.getCurrentUser);

/**
 * @route PUT /api/users/me
 * @desc Update current user profile
 * @access Private
 */
router.put(
  "/me",
  [authMiddleware, validateUserUpdate],
  userController.updateCurrentUser
);

/**
 * @route PUT /api/users/me/password
 * @desc Update current user password
 * @access Private
 */
router.put("/me/password", authMiddleware, userController.updatePassword);

/**
 * @route DELETE /api/users/me
 * @desc Delete current user account (deactivate)
 * @access Private
 */
router.delete("/me", authMiddleware, userController.deleteAccount);

/**
 * @route GET /api/users/me/notifications
 * @desc Get user notification preferences
 * @access Private
 */
router.get(
  "/me/notifications",
  authMiddleware,
  userController.getNotificationPreferences
);

/**
 * @route PUT /api/users/me/notifications
 * @desc Update user notification preferences
 * @access Private
 */
router.put(
  "/me/notifications",
  authMiddleware,
  userController.updateNotificationPreferences
);

module.exports = router;
