/**
 * Patient Controller
 * Handles patient-specific operations
 */
const patientService = require("../services/patient.service");
const { validatePatient } = require("../utils/validation");
const logger = require("../utils/logger");

/**
 * Get all patients with pagination and filtering
 */
exports.getPatients = async (req, res) => {
  try {
    // Extract query parameters
    const {
      name,
      email,
      phone,
      practiceId,
      page = 1,
      limit = 10,
      sortBy = "lastName",
      sortOrder = "asc",
    } = req.query;

    // Check permissions
    const hasPracticeAccess =
      req.user.role === "ADMIN" ||
      (req.user.practiceId === practiceId &&
        ["PRACTICE_ADMIN", "DOCTOR", "RECEPTIONIST"].includes(req.user.role));

    if (!hasPracticeAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view patients from this practice",
      });
    }

    // Build filter
    const filters = {
      name,
      email,
      phone,
      practiceId,
    };

    // Get patients
    const patients = await patientService.getPatients({
      filters,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: patients.data,
      pagination: patients.pagination,
    });
  } catch (error) {
    logger.error("Get patients error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve patients",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get a patient by ID
 */
exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get patient details
    const patient = await patientService.findById(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check permissions
    const canViewPatient =
      req.user.role === "ADMIN" ||
      (req.user.practiceId === patient.practiceId &&
        ["PRACTICE_ADMIN", "DOCTOR", "RECEPTIONIST"].includes(req.user.role)) ||
      (req.user.role === "PATIENT" && req.user.id === patient.userId);

    if (!canViewPatient) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this patient",
      });
    }

    return res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    logger.error(`Get patient by ID error: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve patient",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create a new patient
 */
exports.createPatient = async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validatePatient(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    const {
      userId,
      practiceId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      medicalHistory,
      allergies,
      medications,
      insuranceInfo,
    } = req.body;

    // Check permissions
    const canAddPatient =
      req.user.role === "ADMIN" ||
      (req.user.practiceId === practiceId &&
        ["PRACTICE_ADMIN", "RECEPTIONIST"].includes(req.user.role)) ||
      (req.user.role === "PATIENT" && req.user.id === userId);

    if (!canAddPatient) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add patients to this practice",
      });
    }

    // Create patient
    const patient = await patientService.createPatient({
      userId,
      practiceId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      medicalHistory,
      allergies,
      medications,
      insuranceInfo,
    });

    return res.status(201).json({
      success: true,
      message: "Patient created successfully",
      data: patient,
    });
  } catch (error) {
    logger.error("Create patient error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create patient",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update patient details
 */
exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const patient = await patientService.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check permissions
    const canUpdatePatient =
      req.user.role === "ADMIN" ||
      (req.user.practiceId === patient.practiceId &&
        ["PRACTICE_ADMIN", "RECEPTIONIST"].includes(req.user.role)) ||
      (req.user.role === "PATIENT" && req.user.id === patient.userId);

    if (!canUpdatePatient) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this patient",
      });
    }

    // Validate request body
    const validationErrors = validatePatient(req.body, false); // false for update operation
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      medicalHistory,
      allergies,
      medications,
      insuranceInfo,
    } = req.body;

    // Update patient
    const updatedPatient = await patientService.updatePatient(id, {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      medicalHistory,
      allergies,
      medications,
      insuranceInfo,
    });

    return res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: updatedPatient,
    });
  } catch (error) {
    logger.error("Update patient error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update patient",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete a patient
 */
exports.deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const patient = await patientService.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check permissions
    const canDeletePatient =
      req.user.role === "ADMIN" ||
      (req.user.practiceId === patient.practiceId &&
        ["PRACTICE_ADMIN"].includes(req.user.role));

    if (!canDeletePatient) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this patient",
      });
    }

    // Delete patient
    await patientService.deletePatient(id);

    return res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    logger.error("Delete patient error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete patient",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get patient medical history
 */
exports.getMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const patient = await patientService.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check permissions
    const canViewHistory =
      req.user.role === "ADMIN" ||
      (req.user.practiceId === patient.practiceId &&
        ["PRACTICE_ADMIN", "DOCTOR"].includes(req.user.role)) ||
      (req.user.role === "PATIENT" && req.user.id === patient.userId);

    if (!canViewHistory) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view this patient's medical history",
      });
    }

    // Get medical history
    const medicalHistory = await patientService.getPatientMedicalHistory(id);

    return res.status(200).json({
      success: true,
      data: medicalHistory,
    });
  } catch (error) {
    logger.error("Get patient medical history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve patient medical history",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get patient appointments
 */
exports.getPatientAppointments = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, startDate, endDate } = req.query;

    // Check if patient exists
    const patient = await patientService.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check permissions
    const canViewAppointments =
      req.user.role === "ADMIN" ||
      (req.user.practiceId === patient.practiceId &&
        ["PRACTICE_ADMIN", "DOCTOR", "RECEPTIONIST"].includes(req.user.role)) ||
      (req.user.role === "PATIENT" && req.user.id === patient.userId);

    if (!canViewAppointments) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view this patient's appointments",
      });
    }

    // Get appointments
    const appointments = await patientService.getPatientAppointments(id, {
      status: status ? status.split(",") : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    logger.error("Get patient appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve patient appointments",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
