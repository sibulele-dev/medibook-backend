const express = require("express");
const userController = require("../controllers/user.controller");
const router = express.Router();

// Public routes
router.post("/login", userController.login);
router.get("/check-email", userController.checkEmailRegistration);
router.get("/status", userController.getApiStatus);

// Profile routes (now public)
router.get("/profile/:id?", userController.getProfile);
router.put("/profile/:id?", userController.updateProfile);
router.get("/profile", userController.getProfile);

// Admin only routes (now public)
router.get("/all", userController.getAllUsers);
router.delete("/:id", userController.deleteUser);
router.put("/:id/toggle-status", userController.toggleUserStatus);

// Admin email management routes (now public)
router.get("/admin/allowed-emails", userController.getAllowedAdminEmails);

// Doctor management routes (now public)
router.post("/register/admin", userController.registerAdmin);
router.post("/register/doctor", userController.registerDoctor);

// Add email verification endpoints
router.post("/verify-email", userController.verifyEmail);
router.post("/resend-verification", userController.resendVerificationEmail);

module.exports = router;
