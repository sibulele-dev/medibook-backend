const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointment.controller");
const {
  authMiddleware,
  practiceStaffMiddleware,
} = require("../middleware/auth.middleware");
const {
  practiceAccessMiddleware,
} = require("../middleware/practiceAccess.middleware");
const {
  validateAppointmentCreate,
  validateAppointmentUpdate,
} = require("../middleware/validation.middleware");

/**
 * @route GET /api/appointments
 * @desc Get appointments (filtered by practice for staff, or by user for patients)
 * @access Private
 */
router.get("/", authMiddleware, appointmentController.getAppointments);

/**
 * @route GET /api/appointments/calendar
 * @desc Get appointments in calendar format (for practice dashboard)
 * @access Private (practice staff)
 */
router.get(
  "/calendar",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  appointmentController.getAppointmentsCalendar
);

/**
 * @route GET /api/appointments/:appointmentId
 * @desc Get appointment details
 * @access Private (practice staff or appointment owner)
 */
router.get(
  "/:appointmentId",
  authMiddleware,
  appointmentController.getAppointmentById
);

/**
 * @route POST /api/appointments
 * @desc Create a new appointment (booking)
 * @access Mixed (public for patient booking, private for staff booking)
 */
router.post(
  "/",
  validateAppointmentCreate,
  appointmentController.createAppointment
);

/**
 * @route PUT /api/appointments/:appointmentId
 * @desc Update appointment details
 * @access Private (practice staff or appointment owner)
 */
router.put(
  "/:appointmentId",
  [authMiddleware, validateAppointmentUpdate],
  appointmentController.updateAppointment
);

/**
 * @route DELETE /api/appointments/:appointmentId
 * @desc Cancel an appointment
 * @access Private (practice staff or appointment owner)
 */
router.delete(
  "/:appointmentId",
  authMiddleware,
  appointmentController.cancelAppointment
);

/**
 * @route PUT /api/appointments/:appointmentId/status
 * @desc Update appointment status (confirm, complete, no-show)
 * @access Private (practice staff only)
 */
router.put(
  "/:appointmentId/status",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  appointmentController.updateAppointmentStatus
);

/**
 * @route POST /api/appointments/:appointmentId/reminders
 * @desc Send appointment reminder manually
 * @access Private (practice staff)
 */
router.post(
  "/:appointmentId/reminders",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  appointmentController.sendAppointmentReminder
);

/**
 * @route POST /api/appointments/:appointmentId/reschedule
 * @desc Reschedule an appointment
 * @access Private (practice staff or appointment owner)
 */
router.post(
  "/:appointmentId/reschedule",
  authMiddleware,
  appointmentController.rescheduleAppointment
);

/**
 * @route GET /api/appointments/available-slots
 * @desc Get available appointment slots based on doctor, service, date
 * @access Public
 */
router.get("/available-slots", appointmentController.getAvailableSlots);

module.exports = router;
