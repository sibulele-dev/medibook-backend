const express = require("express");
const userController = require("../controllers/user.controller");
const {
  authenticateToken,
  generateTokens,
  authenticateSession,
  requireAdmin,
  requireDoctorOrAdmin,
  requireOwnership,
} = require("../middleware/auth.middleware");

const router = express.Router();

// Public routes
router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/check-email", userController.checkEmailRegistration);

// Protected routes (require authentication)
router.post("/logout", authenticateSession, userController.logout);
router.get(
  "/profile/:id?",
  authenticateSession,
  requireDoctorOrAdmin,
  requireOwnership("id"),
  userController.getProfile
);
router.put(
  "/profile/:id?",
  authenticateSession,
  requireDoctorOrAdmin,
  requireOwnership("id"),
  userController.updateProfile
);

// Add this route for current user profile
router.get("/profile", authenticateSession, userController.getProfile);

// Admin only routes (require admin privileges)
router.get(
  "/all",
  authenticateSession,
  requireAdmin,
  userController.getAllUsers
);
router.delete(
  "/:id",
  authenticateSession,
  requireAdmin,
  userController.deleteUser
);
router.put(
  "/:id/toggle-status",
  authenticateSession,
  requireAdmin,
  userController.toggleUserStatus
);

// Session management routes (admin only)
router.get(
  "/sessions/stats",
  authenticateSession,
  requireAdmin,
  userController.getSessionStats
);
router.post(
  "/sessions/cleanup",
  authenticateSession,
  requireAdmin,
  userController.cleanupSessions
);
router.post(
  "/:userId/force-logout",
  authenticateSession,
  requireAdmin,
  userController.forceLogoutUser
);

// Admin email management routes
router.get(
  "/admin/allowed-emails",
  authenticateSession,
  requireAdmin,
  userController.getAllowedAdminEmails
);

// Doctor management routes (admin only)
router.post(
  "/admin/register-doctor",
  authenticateSession,
  requireAdmin,
  userController.registerDoctor
);

module.exports = router;
