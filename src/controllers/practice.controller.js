/**
 * Practice Controller
 * Handles medical practice operations
 */
const practiceService = require("../services/practice.service");
const fileService = require("../services/file.service");
const { validatePractice } = require("../utils/validation");
const logger = require("../utils/logger");

/**
 * Get all practices with pagination and filtering
 */
exports.getPractices = async (req, res) => {
  try {
    // Extract query parameters
    const {
      name,
      city,
      specialties,
      page = 1,
      limit = 10,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    // Get practices
    const practices = await practiceService.getPractices({
      name,
      city,
      specialties: specialties ? specialties.split(",") : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: practices.data,
      pagination: practices.pagination,
    });
  } catch (error) {
    logger.error("Get practices error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve practices",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get practice by ID
 */
exports.getPracticeById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get practice details
    const practice = await practiceService.findById(id);

    if (!practice) {
      return res.status(404).json({
        success: false,
        message: "Practice not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: practice,
    });
  } catch (error) {
    logger.error(`Get practice by ID error: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve practice",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create a new practice (admin only)
 */
exports.createPractice = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admins can create practices",
      });
    }

    // Validate request body
    const validationErrors = validatePractice(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    const {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
      specialties,
    } = req.body;

    // Create practice
    const practice = await practiceService.createPractice({
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
      specialties,
    });

    return res.status(201).json({
      success: true,
      message: "Practice created successfully",
      data: practice,
    });
  } catch (error) {
    logger.error("Create practice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create practice",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update practice details
 */
exports.updatePractice = async (req, res) => {
  try {
    const { id } = req.params;

    // Get practice
    const practice = await practiceService.findById(id);
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: "Practice not found",
      });
    }

    // Check permissions
    const canManagePractice =
      req.user.role === "ADMIN" ||
      (req.user.role === "PRACTICE_ADMIN" && req.user.practiceId === id);

    if (!canManagePractice) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this practice",
      });
    }

    // Validate request body
    const validationErrors = validatePractice(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    const {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
      specialties,
      isActive,
    } = req.body;

    // Admin can update all fields, practice admin can't deactivate their practice
    const updateData = {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
      specialties,
    };

    // Only admins can activate/deactivate practices
    if (req.user.role === "ADMIN" && isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update practice
    const updatedPractice = await practiceService.updatePractice(
      id,
      updateData
    );

    return res.status(200).json({
      success: true,
      message: "Practice updated successfully",
      data: updatedPractice,
    });
  } catch (error) {
    logger.error("Update practice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update practice",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Upload practice logo
 */
exports.uploadLogo = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if practice exists
    const practice = await practiceService.findById(id);
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: "Practice not found",
      });
    }

    // Check permissions
    const canManagePractice =
      req.user.role === "ADMIN" ||
      (req.user.role === "PRACTICE_ADMIN" && req.user.practiceId === id);

    if (!canManagePractice) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this practice",
      });
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    // Save file and update practice
    const logoPath = await fileService.savePracticeLogo(id, req.file);
    const updatedPractice = await practiceService.updatePractice(id, {
      logoUrl: logoPath,
    });

    return res.status(200).json({
      success: true,
      message: "Logo uploaded successfully",
      data: {
        logoUrl: updatedPractice.logoUrl,
      },
    });
  } catch (error) {
    logger.error("Upload practice logo error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload practice logo",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete practice (admin only)
 */
exports.deletePractice = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete practices",
      });
    }

    // Check if practice exists
    const practice = await practiceService.findById(id);
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: "Practice not found",
      });
    }

    // Delete practice
    await practiceService.deletePractice(id);

    return res.status(200).json({
      success: true,
      message: "Practice deleted successfully",
    });
  } catch (error) {
    logger.error("Delete practice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete practice",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get practice statistics
 */
exports.getPracticeStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if practice exists
    const practice = await practiceService.findById(id);
    if (!practice) {
      return res.status(404).json({
        success: false,
        message: "Practice not found",
      });
    }

    // Check permissions
    const hasPracticeAccess =
      req.user.role === "ADMIN" || req.user.practiceId === id;

    if (!hasPracticeAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view this practice's statistics",
      });
    }

    // Get statistics
    const stats = await practiceService.getPracticeStatistics(id);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Get practice stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve practice statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
