const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
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
    handleValidationError
  } = require('../middleware/validation.middleware');
const { rateLimitMiddleware, resetRateLimit } = require("../middleware/rateLimit.middleware");


// Public routes
router.post("/login", validateUserLogin, rateLimitMiddleware, userController.login);
router.get("/check-email", validateCheckEmailRegistration, userController.checkEmailRegistration);
router.get("/status", userController.getApiStatus);
router.post("/verify-email", validateEmailVerification, userController.verifyEmail);
router.post("/resend-verification", validateResendVerification, userController.resendVerificationEmail);
router.post("/set-initial-password", validateInitialPassword, userController.setInitialPassword);
router.post("/refresh", validateRefreshToken, userController.refreshToken);
router.get("/password/requirements", validatePasswordRequirements, userController.getPasswordRequirements);

// Authenticated routes
router.use(authMiddleware);

// Profile routes
router.get("/profile/:id?", userController.getProfile);
router.put("/profile/:id?", validateProfileUpdate, userController.updateProfile);
router.get("/profile", userController.getProfile);

// Password management
router.post("/password/change", validatePasswordChange, userController.changePassword);
router.post("/logout", validateLogout, userController.logout);

// Admin only routes
router.get("/all", requireRole('admin'),  validateGetAllUsersQuery, userController.getAllUsers);
router.get("/team-members", requireRole('admin'),  validateGetAllUsersQuery, userController.getTeamMembers);
router.get("/debug-department", requireRole('admin'), userController.debugUserDepartment);
router.delete("/:id", requireRole('admin'), validateUserIdParam, validateDeleteUser, userController.deleteUser);
router.put("/:id/toggle-status", requireRole('admin'), validateUserIdParam,  userController.toggleUserStatus);
router.get("/admin/allowed-emails", authMiddleware, requireRole('admin'), userController.getAllowedAdminEmails);
router.post("/register-admin", requireRole('admin'), validateAdminRegistration, userController.registerAdmin);
router.post("/register-admin-member", requireRole('admin'), validateAdminMemberRegistration, userController.registerAdminMember);
router.post("/register-doctor", requireRole('admin'), validateDoctorRegistration, userController.registerDoctor);
router.delete('/admin/users/:id', authMiddleware, roleMiddleware(['admin']), validateUserIdParam, validateDeleteUser, userController.deleteUser);
  

  
router.get('/admin/debug/user-department', authMiddleware, roleMiddleware(['admin']), userController.debugUserDepartment);

// Error handling
router.use(handleValidationError);


module.exports = router;