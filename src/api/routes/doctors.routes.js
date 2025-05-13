const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctor.controller");
const {
  authMiddleware,
  practiceAdminMiddleware,
} = require("../middleware/auth.middleware");
const {
  practiceAccessMiddleware,
} = require("../middleware/practiceAccess.middleware");
const {
  validateDoctorCreate,
  validateDoctorUpdate,
} = require("../middleware/validation.middleware");
const upload = require("../utils/fileUpload");

/**
 * @route GET /api/doctors
 * @desc Get all doctors (with practice info)
 * @access Public
 */
router.get("/", doctorController.getAllDoctors);

/**
 * @route GET /api/doctors/search
 * @desc Search doctors by name, specialty, practice
 * @access Public
 */
router.get("/search", doctorController.searchDoctors);

/**
 * @route GET /api/doctors/:doctorId
 * @desc Get doctor details
 * @access Public
 */
router.get("/:doctorId", doctorController.getDoctorById);

/**
 * @route POST /api/doctors
 * @desc Create a new doctor
 * @access Private (practice admin)
 */
router.post(
  "/",
  [
    authMiddleware,
    practiceAccessMiddleware,
    practiceAdminMiddleware,
    validateDoctorCreate,
    upload.single("profileImage"),
  ],
  doctorController.createDoctor
);

/**
 * @route PUT /api/doctors/:doctorId
 * @desc Update doctor details
 * @access Private (practice admin or doctor themselves)
 */
router.put(
  "/:doctorId",
  [authMiddleware, validateDoctorUpdate, upload.single("profileImage")],
  doctorController.updateDoctor
);

/**
 * @route DELETE /api/doctors/:doctorId
 * @desc Delete (deactivate) a doctor
 * @access Private (practice admin)
 */
router.delete(
  "/:doctorId",
  [authMiddleware, practiceAccessMiddleware, practiceAdminMiddleware],
  doctorController.deleteDoctor
);

/**
 * @route GET /api/doctors/:doctorId/schedule
 * @desc Get doctor's schedule and availability
 * @access Public
 */
router.get("/:doctorId/schedule", doctorController.getDoctorSchedule);

/**
 * @route GET /api/doctors/:doctorId/services
 * @desc Get services provided by this doctor
 * @access Public
 */
router.get("/:doctorId/services", doctorController.getDoctorServices);

/**
 * @route PUT /api/doctors/:doctorId/services
 * @desc Update doctor's services
 * @access Private (practice admin or doctor themselves)
 */
router.put(
  "/:doctorId/services",
  [authMiddleware, practiceAccessMiddleware],
  doctorController.updateDoctorServices
);

/**
 * @route GET /api/doctors/:doctorId/availability
 * @desc Get doctor's availability for booking
 * @access Public
 */
router.get("/:doctorId/availability", doctorController.getDoctorAvailability);

module.exports = router;
