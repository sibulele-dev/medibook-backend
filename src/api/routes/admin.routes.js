const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/auth.middleware");
const {
  validatePracticeCreate,
} = require("../middleware/validation.middleware");
const upload = require("../utils/fileUpload");

/**
 * @route GET /api/admin/practices
 * @desc Get all practices (admin view)
 * @access Private (admin)
 */
router.get(
  "/practices",
  [authMiddleware, adminMiddleware],
  adminController.getAllPractices
);

/**
 * @route POST /api/admin/practices
 * @desc Create a new practice
 * @access Private (admin)
 */
router.post(
  "/practices",
  [
    authMiddleware,
    adminMiddleware,
    validatePracticeCreate,
    upload.single("logo"),
  ],
  adminController.createPractice
);

/**
 * @route PUT /api/admin/practices/:practiceId
 * @desc Update practice details
 * @access Private (admin)
 */
router.put(
  "/practices/:practiceId",
  [authMiddleware, adminMiddleware, upload.single("logo")],
  adminController.updatePractice
);

/**
 * @route DELETE /api/admin/practices/:practiceId
 * @desc Delete a practice
 * @access Private (admin)
 */
router.delete(
  "/practices/:practiceId",
  [authMiddleware, adminMiddleware],
  adminController.deletePractice
);

/**
 * @route GET /api/admin/users
 * @desc Get all users (admin view)
 * @access Private (admin)
 */
router.get(
  "/users",
  [authMiddleware, adminMiddleware],
  adminController.getAllUsers
);

/**
 * @route PUT /api/admin/users/:userId
 * @desc Update user details (admin action)
 * @access Private (admin)
 */
router.put(
  "/users/:userId",
  [authMiddleware, adminMiddleware],
  adminController.updateUser
);

/**
 * @route DELETE /api/admin/users/:userId
 * @desc Delete/deactivate user
 * @access Private (admin)
 */
router.delete(
  "/users/:userId",
  [authMiddleware, adminMiddleware],
  adminController.deleteUser
);

/**
 * @route POST /api/admin/users/:userId/roles
 * @desc Assign role to user
 * @access Private (admin)
 */
router.post(
  "/users/:userId/roles",
  [authMiddleware, adminMiddleware],
  adminController.assignUserRole
);

/**
 * @route DELETE /api/admin/users/:userId/roles/:roleId
 * @desc Remove role from user
 * @access Private (admin)
 */
router.delete(
  "/users/:userId/roles/:roleId",
  [authMiddleware, adminMiddleware],
  adminController.removeUserRole
);

/**
 * @route GET /api/admin/stats
 * @desc Get system statistics
 * @access Private (admin)
 */
router.get(
  "/stats",
  [authMiddleware, adminMiddleware],
  adminController.getSystemStats
);

/**
 * @route GET /api/admin/audit-logs
 * @desc Get system audit logs
 * @access Private (admin)
 */
router.get(
  "/audit-logs",
  [authMiddleware, adminMiddleware],
  adminController.getAuditLogs
);

/**
 * @route POST /api/admin/practices/:practiceId/activate
 * @desc Activate a practice
 * @access Private (admin)
 */
router.post(
  "/practices/:practiceId/activate",
  [authMiddleware, adminMiddleware],
  adminController.activatePractice
);

/**
 * @route POST /api/admin/practices/:practiceId/deactivate
 * @desc Deactivate a practice
 * @access Private (admin)
 */
router.post(
  "/practices/:practiceId/deactivate",
  [authMiddleware, adminMiddleware],
  adminController.deactivatePractice
);

module.exports = router;
