/**
 * User Controller
 * Handles user management operations
 */
const userService = require("../services/user.service");
const { validateUserUpdate } = require("../utils/validation");
const logger = require("../utils/logger");

/**
 * Get list of users (with filtering options)
 */
exports.getUsers = async (req, res) => {
  try {
    // Extract query parameters
    const {
      role,
      practiceId,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Check user's access permissions
    const hasAccess = await userService.checkUserAccess(req.user, practiceId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access users from this practice",
      });
    }

    // Get paginated users
    const users = await userService.getUsers({
      role,
      practiceId,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: users.data,
      pagination: users.pagination,
    });
  } catch (error) {
    logger.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user details
    const user = await userService.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permissions
    const hasAccess = await userService.checkUserAccess(
      req.user,
      user.practiceId
    );
    if (!hasAccess && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this user",
      });
    }

    // Return user data
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        practiceId: user.practiceId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error(`Get user by ID error: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create a new user (usually by admin or practice manager)
 */
exports.createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, practiceId } = req.body;

    // Validate data
    const validationErrors = validateUserUpdate(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    // Check permissions for practice
    if (practiceId) {
      const hasAccess = await userService.checkUserAccess(req.user, practiceId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to create users for this practice",
        });
      }
    }

    // Check for existing user
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user
    const user = await userService.createUser({
      email,
      password,
      firstName,
      lastName,
      role,
      practiceId,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        practiceId: user.practiceId,
      },
    });
  } catch (error) {
    logger.error("Create user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update user details
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, practiceId } = req.body;

    // Validate data
    const validationErrors = validateUserUpdate(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    // Get current user
    const existingUser = await userService.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permissions
    const isSelfUpdate = req.user.id === id;
    const hasAccess = await userService.checkUserAccess(
      req.user,
      existingUser.practiceId
    );

    if (!hasAccess && !isSelfUpdate) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this user",
      });
    }

    // Restrict what fields a user can update for themselves
    if (isSelfUpdate && (role !== undefined || practiceId !== undefined)) {
      return res.status(403).json({
        success: false,
        message: "You cannot change your own role or practice",
      });
    }

    // Update user
    const updatedUser = await userService.updateUser(id, {
      firstName,
      lastName,
      email,
      role,
      practiceId,
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        practiceId: updatedUser.practiceId,
      },
    });
  } catch (error) {
    logger.error("Update user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Change user password
 */
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Check if user exists
    const user = await userService.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permissions
    const isSelfUpdate = req.user.id === id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isSelfUpdate && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to change this user's password",
      });
    }

    // If it's the user changing their own password, verify current password
    if (
      isSelfUpdate &&
      !(await userService.verifyPassword(id, currentPassword))
    ) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    await userService.changePassword(id, newPassword);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await userService.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permissions
    const isSelfDelete = req.user.id === id;
    const hasAccess = await userService.checkUserAccess(
      req.user,
      user.practiceId
    );

    if (!hasAccess && !isSelfDelete) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this user",
      });
    }

    // Delete user
    await userService.deleteUser(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
