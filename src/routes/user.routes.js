const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware.js");

const requireRole = require("../middleware/role.middleware");
const { 
  requirePermission, 
  requireAnyPermission, 
  requireAllPermissions, 
  requireDepartment, 
  requireSuperAdmin,
  addUserPermissions 
} = require("../middleware/permission.middleware");
const {
    validateUserRegistration,
    validateAdminRegistration,
    validateAdminMemberRegistration,
    validateDoctorRegistration,
    validateLogin,
    validateProfileUpdate,
    validatePasswordChange,
    validateInitialPassword,
    validateEmailVerification,
    validateResendVerification,
    validateRefreshToken,
    validateGetAllUsersQuery,
    validateUserIdParam,
    validateDeleteUser,
    validateCheckEmailRegistration,
    validateUserIdAndBody,
    validatePasswordRequirements,
    validateLogout,
    handleValidationError
  } = require('../middleware/validation.middleware');
const { rateLimitMiddleware, refreshRateLimitMiddleware, resetRateLimit } = require("../middleware/rateLimit.middleware");


// Public routes
router.post("/login", validateLogin, rateLimitMiddleware, userController.login);
router.get("/check-email", validateCheckEmailRegistration, userController.checkEmailRegistration);
router.get("/status", userController.getApiStatus);
router.post("/verify-email", validateEmailVerification, userController.verifyEmail);
router.post("/resend-verification", validateResendVerification, userController.resendVerificationEmail);
router.post("/set-initial-password", validateInitialPassword, userController.setInitialPassword);
router.post("/refresh", refreshRateLimitMiddleware, userController.refreshToken);
router.get("/password/requirements", validatePasswordRequirements, userController.getPasswordRequirements);

// Authenticated routes
router.use(authMiddleware);
// router.use(addUserPermissions); // Add user permissions to request object

// Profile routes
router.get("/profile/:id?", userController.getProfile);
router.put("/profile/:id?", validateProfileUpdate, userController.updateProfile);

// Password management
router.post("/password/change", validatePasswordChange, userController.changePassword);
router.post("/logout", validateLogout, userController.logout);

// Admin only routes with granular permissions
router.get("/all", requirePermission('view_users'), validateGetAllUsersQuery, userController.getAllUsers);
router.get("/team-members", requirePermission('view_users'), validateGetAllUsersQuery, userController.getTeamMembers);
router.get("/debug-department", requirePermission('system_settings'), userController.debugUserDepartment);
router.delete("/:id", requirePermission('delete_users'), validateUserIdParam, validateDeleteUser, userController.deleteUser);
router.put("/:id/toggle-status", requirePermission('update_users'), validateUserIdParam, userController.toggleUserStatus);
router.get("/admin/allowed-emails", requirePermission('system_settings'), userController.getAllowedAdminEmails);
router.post("/register-admin", requirePermission('create_users'), validateAdminRegistration, userController.registerAdmin);
router.post("/register-admin-member", requirePermission('create_users'), validateAdminMemberRegistration, userController.registerAdminMember);
router.post("/register-doctor", requirePermission('create_users'), validateDoctorRegistration, userController.registerDoctor);

// Session Management (Admin only)
router.get("/sessions", requirePermission('manage_sessions'), userController.getAllSessions);
router.delete("/sessions/:token", requirePermission('manage_sessions'), userController.revokeUserSession);

// Admin Dashboard and Activity Logs
router.get("/admin/dashboard", requireRole('admin'), userController.getAdminDashboard);
router.get("/admin/activity-logs", requirePermission('access_audit_logs'), userController.getAdminActivityLogs);

// Permission Management (Super Admin only)
router.get("/permissions/:userId", requireSuperAdmin(), userController.getUserPermissions);
router.post("/permissions/grant", requireSuperAdmin(), userController.grantPermission);
router.post("/permissions/revoke", requireSuperAdmin(), userController.revokePermission);
router.get("/departments", requirePermission('manage_departments'), userController.getAllDepartments);
router.get("/permissions", requirePermission('manage_departments'), userController.getAllPermissions);

// Team management
router.get("/team", requirePermission('manage_users'), userController.getTeamMembers);
router.post("/team-member", requirePermission('create_users'), userController.addTeamMember);
router.put("/team-member/:id/permissions", requirePermission('update_users'), userController.updateTeamMemberPermissions);
router.get("/roles", requirePermission('manage_users'), userController.getRoles);

// Error handling
router.use(handleValidationError);


module.exports = router;