/**
 * Doctor Controller
 * Handles doctor-specific operations
 */
const doctorService = require("../services/doctor.service");
const fileService = require("../services/file.service");
const { validateDoctor } = require("../utils/validation");
const logger = require("../utils/logger");

/**
 * Get all doctors with pagination and filtering
 */
exports.getDoctors = async (req, res) => {
  try {
    // Extract query parameters
    const {
      name,
      specialties,
      practiceId,
      isActive,
      page = 1,
      limit = 10,
      sortBy = "lastName",
      sortOrder = "asc",
    } = req.query;

    // Build filter object
    const filters = {
      name,
      specialties: specialties ? specialties.split(",") : undefined,
      practiceId,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
    };

    // Get doctors
    const doctors = await doctorService.getDoctors({
      filters,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: doctors.data,
      pagination: doctors.pagination,
    });
  } catch (error) {
    logger.error("Get doctors error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve doctors",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get a doctor by ID
 */
exports.getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get doctor details
    const doctor = await doctorService.findById(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    logger.error(`Get doctor by ID error: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve doctor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create a new doctor
 */
exports.createDoctor = async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validateDoctor(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    const {
      userId,
      practiceId,
      title,
      firstName,
      lastName,
      specialties,
      bio,
      education,
      languages,
      acceptingNewPatients,
    } = req.body;

    // Check permissions
    const canAddDoctor =
      req.user.role === "ADMIN" ||
      (req.user.role === "PRACTICE_ADMIN" &&
        req.user.practiceId === practiceId);

    if (!canAddDoctor) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add doctors to this practice",
      });
    }

    // Create doctor
    const doctor = await doctorService.createDoctor({
      userId,
      practiceId,
      title,
      firstName,
      lastName,
      specialties,
      bio,
      education,
      languages,
      acceptingNewPatients,
    });

    return res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      data: doctor,
    });
  } catch (error) {
    logger.error("Create doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create doctor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update doctor details
 */
exports.updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if doctor exists
    const doctor = await doctorService.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check permissions
    const canUpdateDoctor =
      req.user.role === "ADMIN" ||
      (req.user.role === "PRACTICE_ADMIN" &&
        req.user.practiceId === doctor.practiceId) ||
      (req.user.role === "DOCTOR" && req.user.id === doctor.userId);

    if (!canUpdateDoctor) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this doctor",
      });
    }

    // Validate request body
    const validationErrors = validateDoctor(req.body, false); // false for update operation
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    const {
      title,
      firstName,
      lastName,
      specialties,
      bio,
      education,
      languages,
      acceptingNewPatients,
      isActive,
    } = req.body;

    // Update doctor
    const updatedDoctor = await doctorService.updateDoctor(id, {
      title,
      firstName,
      lastName,
      specialties,
      bio,
      education,
      languages,
      acceptingNewPatients,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: "Doctor updated successfully",
      data: updatedDoctor,
    });
  } catch (error) {
    logger.error("Update doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update doctor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Upload doctor profile image
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if doctor exists
    const doctor = await doctorService.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check permissions
    const canUpdateDoctor =
      req.user.role === "ADMIN" ||
      (req.user.role === "PRACTICE_ADMIN" &&
        req.user.practiceId === doctor.practiceId) ||
      (req.user.role === "DOCTOR" && req.user.id === doctor.userId);

    if (!canUpdateDoctor) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this doctor",
      });
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    // Save file and update doctor
    const imagePath = await fileService.saveDoctorImage(id, req.file);
    const updatedDoctor = await doctorService.updateDoctor(id, {
      profileImageUrl: imagePath,
    });

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      data: {
        profileImageUrl: updatedDoctor.profileImageUrl,
      },
    });
  } catch (error) {
    logger.error("Upload doctor profile image error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload profile image",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete a doctor
 */
exports.deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if doctor exists
    const doctor = await doctorService.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check permissions
    const canDeleteDoctor =
      req.user.role === "ADMIN" ||
      (req.user.role === "PRACTICE_ADMIN" &&
        req.user.practiceId === doctor.practiceId);

    if (!canDeleteDoctor) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this doctor",
      });
    }

    // Delete doctor
    await doctorService.deleteDoctor(id);

    return res.status(200).json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    logger.error("Delete doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete doctor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get doctor's appointment statistics
 */
exports.getDoctorStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Check if doctor exists
    const doctor = await doctorService.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check permissions
    const canViewStats =
      req.user.role === "ADMIN" ||
      (req.user.role === "PRACTICE_ADMIN" &&
        req.user.practiceId === doctor.practiceId) ||
      (req.user.role === "DOCTOR" && req.user.id === doctor.userId);

    if (!canViewStats) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this doctor's statistics",
      });
    }

    // Get statistics
    const stats = await doctorService.getDoctorStatistics(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Get doctor stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve doctor statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
