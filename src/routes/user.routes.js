const express = require("express");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const { rateLimitMiddleware, resetRateLimit } = require("../middleware/rateLimit.middleware");
const router = express.Router();

// Public routes
router.post("/login", rateLimitMiddleware, userController.login);
router.get("/check-email", userController.checkEmailRegistration);
router.get("/status", userController.getApiStatus);
router.post("/verify-email", userController.verifyEmail);
router.post("/resend-verification", userController.resendVerificationEmail);
router.post("/set-initial-password", userController.setInitialPassword);
router.post("/refresh", userController.refreshToken);
router.get("/password/requirements", userController.getPasswordRequirements);

// Authenticated routes
router.use(authMiddleware);

// Profile routes
router.get("/profile/:id?", userController.getProfile);
router.put("/profile/:id?", userController.updateProfile);
router.get("/profile", userController.getProfile);

// Password management
router.post("/password/change", userController.changePassword);
router.post("/logout", userController.logout);

// Admin only routes
router.get("/all", requireRole('admin'), userController.getAllUsers);
router.get("/team-members", requireRole('admin'), userController.getTeamMembers);
router.get("/debug-department", requireRole('admin'), userController.debugUserDepartment);
router.delete("/:id", requireRole('admin'), userController.deleteUser);
router.put("/:id/toggle-status", requireRole('admin'), userController.toggleUserStatus);
router.get("/admin/allowed-emails", requireRole('admin'), userController.getAllowedAdminEmails);
router.post("/register/admin", requireRole('admin'), userController.registerAdmin);
router.post("/register/admin/member", requireRole('admin'), userController.registerAdminMember);
router.post("/register/doctor", requireRole('admin'), userController.registerDoctor);

module.exports = router;