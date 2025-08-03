const express = require("express");
const userController = require("../controllers/user.controller");
const requireDepartment = require("../middleware/department.middleware");
const { rateLimitMiddleware, resetRateLimit } = require("../middleware/rateLimit.middleware");
const router = express.Router();

// Public routes
router.post("/login", rateLimitMiddleware, userController.login);
router.get("/check-email", userController.checkEmailRegistration);
router.get("/status", userController.getApiStatus);

// Profile routes (now public)
router.get("/profile/:id?", userController.getProfile);
router.put("/profile/:id?", userController.updateProfile);
router.get("/profile", userController.getProfile);

// Admin only routes (now public)
router.get("/all", userController.getAllUsers);
router.get("/team-members", userController.getTeamMembers); // Temporarily removed department requirement for testing
router.get("/debug-department", userController.debugUserDepartment); // Debug route
router.delete("/:id", userController.deleteUser);
router.put("/:id/toggle-status", userController.toggleUserStatus);

// Admin email management routes (now public)
router.get("/admin/allowed-emails", userController.getAllowedAdminEmails);

// Doctor management routes (now public)
router.post("/register/admin", userController.registerAdmin);
router.post(
  "/register/admin/member",
  requireDepartment("super_admin"),
  userController.registerAdminMember
);
router.post("/register/doctor", userController.registerDoctor);

// Add email verification endpoints
router.post("/verify-email", userController.verifyEmail);
router.post("/resend-verification", userController.resendVerificationEmail);

// Add set initial password endpoint (for team members and doctors)
router.post("/set-initial-password", userController.setInitialPassword);

// Add refresh token endpoint
router.post("/refresh", userController.refreshToken);

// Add logout endpoint
router.post("/logout", userController.logout);

// Password management routes
router.get("/password/requirements", userController.getPasswordRequirements);
router.post("/password/change", userController.changePassword);

module.exports = router;
