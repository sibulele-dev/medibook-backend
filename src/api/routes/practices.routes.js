const express = require("express");
const router = express.Router();
const practiceController = require("../controllers/practice.controller");
const {
  authMiddleware,
  adminMiddleware,
  practiceAdminMiddleware,
} = require("../middleware/auth.middleware");
const {
  practiceAccessMiddleware,
} = require("../middleware/practiceAccess.middleware");
const {
  validatePracticeCreate,
  validatePracticeUpdate,
} = require("../middleware/validation.middleware");
const upload = require("../utils/fileUpload");

/**
 * @route GET /api/practices
 * @desc Get all practices (public info)
 * @access Public
 */
router.get("/", practiceController.getAllPractices);

/**
 * @route GET /api/practices/search
 * @desc Search practices by name, location, specialty
 * @access Public
 */
router.get("/search", practiceController.searchPractices);

/**
 * @route GET /api/practices/:practiceId
 * @desc Get practice details
 * @access Public
 */
router.get("/:practiceId", practiceController.getPracticeById);

/**
 * @route POST /api/practices
 * @desc Create a new practice (admin only)
 * @access Private (admin)
 */
router.post(
  "/",
  [
    authMiddleware,
    adminMiddleware,
    validatePracticeCreate,
    upload.single("logo"),
  ],
  practiceController.createPractice
);

/**
 * @route PUT /api/practices/:practiceId
 * @desc Update practice details
 * @access Private (admin or practice admin)
 */
router.put(
  "/:practiceId",
  [
    authMiddleware,
    practiceAccessMiddleware,
    validatePracticeUpdate,
    upload.single("logo"),
  ],
  practiceController.updatePractice
);

/**
 * @route DELETE /api/practices/:practiceId
 * @desc Delete a practice
 * @access Private (admin only)
 */
router.delete(
  "/:practiceId",
  [authMiddleware, adminMiddleware],
  practiceController.deletePractice
);

/**
 * @route GET /api/practices/:practiceId/services
 * @desc Get practice services
 * @access Public
 */
router.get("/:practiceId/services", practiceController.getPracticeServices);

/**
 * @route GET /api/practices/:practiceId/doctors
 * @desc Get practice doctors
 * @access Public
 */
router.get("/:practiceId/doctors", practiceController.getPracticeDoctors);

/**
 * @route GET /api/practices/:practiceId/availability
 * @desc Get practice overall availability
 * @access Public
 */
router.get(
  "/:practiceId/availability",
  practiceController.getPracticeAvailability
);

/**
 * @route PUT /api/practices/:practiceId/settings
 * @desc Update practice settings (working hours, booking options)
 * @access Private (practice admin)
 */
router.put(
  "/:practiceId/settings",
  [authMiddleware, practiceAccessMiddleware, practiceAdminMiddleware],
  practiceController.updatePracticeSettings
);

/**
 * @route POST /api/practices/:practiceId/staff
 * @desc Add staff member to practice
 * @access Private (practice admin)
 */
router.post(
  "/:practiceId/staff",
  [authMiddleware, practiceAccessMiddleware, practiceAdminMiddleware],
  practiceController.addStaffMember
);

module.exports = router;
