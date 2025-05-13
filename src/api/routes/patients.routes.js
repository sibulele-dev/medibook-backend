const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patient.controller");
const {
  authMiddleware,
  practiceStaffMiddleware,
} = require("../middleware/auth.middleware");
const {
  practiceAccessMiddleware,
} = require("../middleware/practiceAccess.middleware");
const {
  validatePatientCreate,
  validatePatientUpdate,
} = require("../middleware/validation.middleware");

/**
 * @route GET /api/patients
 * @desc Get patients (practice staff only, filtered by practice)
 * @access Private (practice staff)
 */
router.get(
  "/",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  patientController.getPatients
);

/**
 * @route GET /api/patients/search
 * @desc Search patients by name, email, phone
 * @access Private (practice staff)
 */
router.get(
  "/search",
  [authMiddleware, practiceAccessMiddleware, practiceStaffMiddleware],
  patientController.searchPatients
);

/**
 * @route GET /api/patients/:patientId
 * @desc Get patient details
 * @access Private (practice staff or patient themselves)
 */
router.get("/:patientId", authMiddleware, patientController.getPatientById);

/**
 * @route POST /api/patients
 * @desc Create a new patient (from practice side)
 * @access Private (practice staff)
 */
router.post(
  "/",
  [
    authMiddleware,
    practiceAccessMiddleware,
    practiceStaffMiddleware,
    validatePatientCreate,
  ],
  patientController.createPatient
);

/**
 * @route PUT /api/patients/:patientId
 * @desc Update patient details
 * @access Private (practice staff or patient themselves)
 */
router.put(
  "/:patientId",
  [authMiddleware, validatePatientUpdate],
  patientController.updatePatient
);

/**
 * @route DELETE /api/patients/:patientId
 * @desc Delete (deactivate) a patient
 * @access Private (practice admin or patient themselves)
 */
router.delete("/:patientId", authMiddleware, patientController.deletePatient);

/**
 * @route GET /api/patients/:patientId/appointments
 * @desc Get patient's appointments
 * @access Private (practice staff or patient themselves)
 */
router.get(
  "/:patientId/appointments",
  authMiddleware,
  patientController.getPatientAppointments
);

/**
 * @route GET /api/patients/:patientId/medical-history
 * @desc Get patient's medical history
 * @access Private (practice doctors or patient themselves)
 */
router.get(
  "/:patientId/medical-history",
  authMiddleware,
  patientController.getPatientMedicalHistory
);

/**
 * @route POST /api/patients/:patientId/medical-history
 * @desc Add medical history entry
 * @access Private (practice doctors)
 */
router.post(
  "/:patientId/medical-history",
  [authMiddleware, practiceAccessMiddleware],
  patientController.addMedicalHistoryEntry
);

/**
 * @route GET /api/patients/me
 * @desc Get current patient profile (for patient portal)
 * @access Private (patient only)
 */
router.get("/me", authMiddleware, patientController.getCurrentPatientProfile);

module.exports = router;
