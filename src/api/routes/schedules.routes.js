const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/schedule.controller");
const {
  authMiddleware,
  practiceStaffMiddleware,
} = require("../middleware/auth.middleware");
const {
  practiceAccessMiddleware,
} = require("../middleware/practiceAccess.middleware");
const {
  validateScheduleCreate,
  validateScheduleUpdate,
} = require("../middleware/validation.middleware");

/**
 * @route GET /api/schedules
 * @desc Get schedules (filtered by practice and doctor)
 * @access Private (practice staff)
 */
router.get(
  "/",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  scheduleController.getSchedules
);

/**
 * @route GET /api/schedules/:scheduleId
 * @desc Get schedule details
 * @access Private (practice staff or schedule owner)
 */
router.get("/:scheduleId", authMiddleware, scheduleController.getScheduleById);

/**
 * @route POST /api/schedules
 * @desc Create a new schedule (regular working hours)
 * @access Private (practice staff)
 */
router.post(
  "/",
  [
    authMiddleware,
    practiceAccessMiddleware,
    practiceStaffMiddleware,
    validateScheduleCreate,
  ],
  scheduleController.createSchedule
);

/**
 * @route PUT /api/schedules/:scheduleId
 * @desc Update schedule details
 * @access Private (practice staff)
 */
router.put(
  "/:scheduleId",
  [
    authMiddleware,
    practiceAccessMiddleware,
    practiceStaffMiddleware,
    validateScheduleUpdate,
  ],
  scheduleController.updateSchedule
);

/**
 * @route DELETE /api/schedules/:scheduleId
 * @desc Delete a schedule
 * @access Private (practice staff)
 */
router.delete(
  "/:scheduleId",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  scheduleController.deleteSchedule
);

/**
 * @route POST /api/schedules/exceptions
 * @desc Create a schedule exception (vacation, time off)
 * @access Private (practice staff)
 */
router.post(
  "/exceptions",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  scheduleController.createScheduleException
);

/**
 * @route PUT /api/schedules/exceptions/:exceptionId
 * @desc Update a schedule exception
 * @access Private (practice staff)
 */
router.put(
  "/exceptions/:exceptionId",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  scheduleController.updateScheduleException
);

/**
 * @route DELETE /api/schedules/exceptions/:exceptionId
 * @desc Delete a schedule exception
 * @access Private (practice staff)
 */
router.delete(
  "/exceptions/:exceptionId",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  scheduleController.deleteScheduleException
);

/**
 * @route GET /api/schedules/doctor/:doctorId
 * @desc Get a doctor's schedule
 * @access Private (practice staff)
 */
router.get(
  "/doctor/:doctorId",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  scheduleController.getDoctorSchedule
);

/**
 * @route GET /api/schedules/availability
 * @desc Get schedule availability (for booking)
 * @access Public
 */
router.get("/availability", scheduleController.getScheduleAvailability);

module.exports = router;
