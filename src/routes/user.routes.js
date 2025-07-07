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
router.post("/forgot-password", userController.sendPasswordResetEmail);
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
router.get(
  "/sessions/active",
  authenticateSession,
  requireAdmin,
  userController.getActiveSessions
);
router.get(
  "/sessions/details",
  authenticateSession,
  requireAdmin,
  userController.getSessionDetails
);
router.post(
  "/sessions/cleanup-expired",
  authenticateSession,
  requireAdmin,
  userController.cleanupExpiredSessions
);
router.post(
  "/sessions/cleanup",
  authenticateSession,
  requireAdmin,
  userController.cleanupSessions
);
router.post(
  "/sessions/emergency-clear",
  authenticateSession,
  requireAdmin,
  userController.emergencyClearAllSessions
);

// Force logout specific user (admin only)
router.post(
  "/:userId/force-logout",
  authenticateSession,
  requireAdmin,
  userController.forceLogoutUser
);

// API Status endpoint (public)
router.get("/status", userController.getApiStatus);

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

// Admin session management routes (admin only)
router.delete(
  "/sessions/:sessionToken",
  authenticateSession,
  requireAdmin,
  userController.invalidateSession
);

module.exports = router;
