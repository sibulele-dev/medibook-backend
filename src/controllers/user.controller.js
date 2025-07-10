const jwt = require("jsonwebtoken");
const userService = require("../services/user.service");
const emailService = require("../services/email.service");
const config = require("../config/config");
const redisClient = require("../config/redis");
const { v4: uuidv4 } = require("uuid");

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

class UserController {
  // Register a new user
  async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message:
            "All fields are required: email, password, firstName, lastName",
        });
      }

      // Validate email format
      const emailRegex = config.validation.email.regex;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const userData = {
        email: normalizedEmail,
        password,
        firstName,
        lastName,
      };

      // Check if email is allowed to register before proceeding
      if (!userService.isEmailAllowedToRegister(normalizedEmail)) {
        return res.status(403).json({
          success: false,
          message:
            "Registration is restricted to authorized admin emails only. Please contact the system administrator if you believe you should have access.",
          code: "REGISTRATION_RESTRICTED",
        });
      }

      const newUser = await userService.registerUser(userData);

      // Send welcome email (non-blocking)
      try {
        await emailService.sendWelcomeEmail(
          newUser.email,
          `${newUser.firstName} ${newUser.lastName}`
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail registration if email fails
      }

      // Generate JWT token
      const token = generateToken(newUser.id);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: newUser,
          role: newUser.role,
          isAdmin: newUser.role === "admin",
          token,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);

      if (error.name === "JsonWebTokenError") {
        return res.status(500).json({
          success: false,
          message: "A technical issue occurred. Please try again later.",
        });
      }

      // Handle registration restriction error
      if (
        error.message &&
        error.message.includes("Registration is restricted")
      ) {
        return res.status(403).json({
          success: false,
          message: error.message,
          code: "REGISTRATION_RESTRICTED",
        });
      }

      const isValidationError =
        error.message && error.message.startsWith("Validation failed:");
      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const deviceId = req.headers["x-device-id"];

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }
      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "Device ID is required",
        });
      }

      // Get user by email
      const user = await userService.getUserByEmail(email, true);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      // Verify password
      const isPasswordValid = await userService.verifyPassword(
        password,
        user.password
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Only clear the session for this device
      await userService.invalidateUserDeviceSession(user.id, deviceId);
      console.log(`Cleared existing session for user: ${user.email} on device: ${deviceId}`);

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;

      // Generate session token and store in Redis
      const sessionToken = uuidv4();
      await redisClient.set(`session:${user.id}:${deviceId}`, sessionToken, { EX: 60 * 60 * 24 }); // 1 day expiry

      // Set HTTP-only cookie
      res.cookie("sessionToken", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 24 * 60 * 60 * 1000,
      });

      console.log(`New session created for user: ${user.email} on device: ${deviceId}`);

      res.status(200).json({
        success: true,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.params.id || req.user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const { password, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        data: {
          user: userWithoutPassword,
          role: user.role,
          isAdmin: user.role === "admin",
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.params.id || req.user?.id;
      const updateData = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      // Remove sensitive fields from update data
      delete updateData.password;
      delete updateData.role;
      delete updateData.id;
      delete updateData.createdAt;

      // Validate email format if email is being updated
      if (updateData.email) {
        const emailRegex = config.validation.email.regex;
        if (!emailRegex.test(updateData.email)) {
          return res.status(400).json({
            success: false,
            message: "Invalid email format",
          });
        }
        updateData.email = updateData.email.toLowerCase().trim();
      }

      const updatedUser = await userService.updateUser(userId, updateData);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: updatedUser,
          role: updatedUser.role,
          isAdmin: updatedUser.role === "admin",
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.params.id || req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }

      // Get user for password verification
      const user = await userService.getUserByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await userService.verifyPassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Update password
      await userService.updatePassword(userId, newPassword);

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      const { page = 1, limit = 10, search, status } = req.query;
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
      };

      const result = await userService.getAllUsers(options);

      res.status(200).json({
        success: true,
        data: {
          users: result.users,
          pagination: {
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalUsers: result.totalUsers,
            hasNext: result.hasNext,
            hasPrev: result.hasPrev,
          },
        },
      });
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Toggle user status (admin only)
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      // Prevent admin from deactivating themselves
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          message: "Cannot modify your own account status",
        });
      }

      const result = await userService.toggleUserStatus(id);

      res.status(200).json({
        success: true,
        message: `User ${
          result.isActive ? "activated" : "deactivated"
        } successfully`,
        data: result,
      });
    } catch (error) {
      console.error("Toggle user status error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Update user role (admin only)
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      // Validate role
      const validRoles = ["admin", "user"];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Must be 'admin' or 'user'",
        });
      }

      // Prevent admin from changing their own role
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          message: "Cannot modify your own role",
        });
      }

      const result = await userService.updateUserRole(id, role);

      res.status(200).json({
        success: true,
        message: "User role updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Delete user (admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      // Prevent admin from deleting themselves
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete your own account",
        });
      }

      const result = await userService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
        data: result,
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const user = await userService.getUserById(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
        });
      }

      // Generate new access token
      const newToken = generateToken(user.id);

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          token: newToken,
        },
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const sessionToken = req.cookies.sessionToken;
      if (sessionToken) {
        await redisClient.del(sessionToken);
        res.clearCookie("sessionToken");
        console.log("User logged out successfully");
      }
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Get session statistics
  async getSessionStats(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      const stats = await userService.getSessionStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get session stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // API Status endpoint (public)
  async getApiStatus(req, res) {
    try {
      const startTime = Date.now();

      // Check database connection
      let dbStatus = "unknown";
      try {
        await userService.testDatabaseConnection();
        dbStatus = "connected";
      } catch (error) {
        console.error("Database connection test failed:", error);
        dbStatus = "disconnected";
      }

      // Check Redis connection
      let redisStatus = "unknown";
      try {
        await redisClient.ping();
        redisStatus = "connected";
      } catch (error) {
        console.error("Redis connection test failed:", error);
        redisStatus = "disconnected";
      }

      // Get session statistics (if Redis is connected)
      let sessionStats = null;
      if (redisStatus === "connected") {
        try {
          sessionStats = await userService.getSessionStats();
        } catch (error) {
          console.error("Failed to get session stats:", error);
        }
      }

      const responseTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          status: "operational",
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`,
          services: {
            database: {
              status: dbStatus,
              type: "PostgreSQL with Drizzle ORM",
            },
            redis: {
              status: redisStatus,
              type: "Session Storage",
            },
          },
          sessions: sessionStats,
          environment: process.env.NODE_ENV || "development",
          version: "1.0.0",
        },
      });
    } catch (error) {
      console.error("API status error:", error);
      res.status(500).json({
        success: false,
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Admin: Cleanup all sessions (logs out all users except current admin)
  async cleanupSessions(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      // Get session stats before cleanup for logging
      const statsBefore = await userService.getSessionStats();

      // Get current admin's session token
      const currentSessionToken = req.cookies.sessionToken;

      // Clear ALL sessions from Redis EXCEPT the current admin's session
      const cleanedCount = await userService.cleanupAllSessionsExcept(
        currentSessionToken
      );

      // Log the action
      console.log(
        `ADMIN SESSION CLEANUP: ${cleanedCount} sessions cleared by admin: ${
          req.user.email
        } at ${new Date().toISOString()}. Admin session preserved.`
      );

      res.status(200).json({
        success: true,
        message: `Cleaned up ${cleanedCount} sessions. All other users have been logged out.`,
        data: {
          cleanedCount,
          statsBefore,
          timestamp: new Date().toISOString(),
          clearedBy: req.user.email,
          adminSessionPreserved: true,
        },
      });
    } catch (error) {
      console.error("Cleanup sessions error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Cleanup expired sessions only (keeps active sessions)
  async cleanupExpiredSessions(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      const cleanedCount = await userService.cleanupExpiredSessions();
      res.status(200).json({
        success: true,
        message: `Cleaned up ${cleanedCount} expired sessions`,
        data: { cleanedCount },
      });
    } catch (error) {
      console.error("Cleanup expired sessions error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Emergency clear all sessions (for security breaches)
  async emergencyClearAllSessions(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Admin password is required for emergency session clear.",
        });
      }

      // Verify admin password
      const adminUser = await userService.getUserByEmail(req.user.email, true);
      if (!adminUser) {
        return res.status(404).json({
          success: false,
          message: "Admin user not found.",
        });
      }

      const isPasswordValid = await userService.verifyPassword(
        password,
        adminUser.password
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin password.",
        });
      }

      // Get session stats before cleanup
      const statsBefore = await userService.getSessionStats();

      // Clear all sessions (including admin's own session)
      const result = await userService.clearAllSessions();

      // Verify all sessions are cleared
      const statsAfter = await userService.getSessionStats();

      // Log the emergency action
      console.log(
        `EMERGENCY: All sessions cleared by admin: ${
          req.user.email
        } at ${new Date().toISOString()}. Before: ${
          statsBefore.totalSessions
        } sessions, After: ${statsAfter.totalSessions} sessions.`
      );

      // Clear the current session cookie immediately
      res.clearCookie("sessionToken");

      res.status(200).json({
        success: true,
        message:
          "EMERGENCY: All sessions cleared due to security breach. You will be logged out immediately.",
        data: {
          ...result,
          statsBefore,
          statsAfter,
          verification: {
            allSessionsCleared: statsAfter.totalSessions === 0,
            totalSessionsAfter: statsAfter.totalSessions,
            uniqueUsersAfter: statsAfter.uniqueUsers,
          },
        },
        clearedBy: req.user.email,
        timestamp: new Date().toISOString(),
        logoutRequired: true,
      });
    } catch (error) {
      console.error("Emergency clear sessions error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Force logout user (invalidate all sessions)
  async forceLogoutUser(req, res) {
    try {
      const { userId } = req.params;

      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      // Prevent admin from force logging out themselves
      if (req.user.id === userId) {
        return res.status(400).json({
          success: false,
          message: "Cannot force logout yourself",
        });
      }

      await userService.invalidateAllUserSessions(userId);
      res.status(200).json({
        success: true,
        message: "User sessions invalidated successfully",
      });
    } catch (error) {
      console.error("Force logout user error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Check if email is allowed to register
  async checkEmailRegistration(req, res) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email parameter is required",
        });
      }

      // Validate email format
      const emailRegex = config.validation.email.regex;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const isAllowed = userService.isEmailAllowedToRegister(normalizedEmail);

      res.status(200).json({
        success: true,
        data: {
          email: normalizedEmail,
          isAllowed,
          message: isAllowed
            ? "Email is authorized for registration"
            : "Email is not authorized for registration",
        },
      });
    } catch (error) {
      console.error("Check email registration error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Get allowed admin emails
  async getAllowedAdminEmails(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      const allowedEmails = userService.ALLOWED_ADMIN_EMAILS;

      res.status(200).json({
        success: true,
        data: {
          allowedEmails,
          count: allowedEmails.length,
          message: "These emails are authorized for registration",
        },
      });
    } catch (error) {
      console.error("Get allowed admin emails error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Register a new doctor
  async registerDoctor(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      const {
        email,
        password,
        firstName,
        lastName,
        specialization,
        phoneNumber,
        dateOfBirth,
        address,
        bio,
      } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: "Required fields: email, password, firstName, lastName",
        });
      }

      // Validate email format
      const emailRegex = config.validation.email.regex;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const doctorData = {
        email: normalizedEmail,
        password,
        firstName,
        lastName,
        specialization,
        phoneNumber,
        dateOfBirth,
        address,
        bio,
      };

      // Register the doctor
      const newDoctor = await userService.registerDoctor(
        doctorData,
        req.user.id
      );

      // Send welcome email (non-blocking)
      try {
        await emailService.sendWelcomeEmail(
          newDoctor.email,
          `${newDoctor.firstName} ${newDoctor.lastName}`
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        success: true,
        message: "Doctor registered successfully",
        data: {
          doctor: newDoctor,
          role: newDoctor.role,
          isAdmin: false,
          registeredBy: req.user.id,
        },
      });
    } catch (error) {
      console.error("Register doctor error:", error);

      if (error.name === "JsonWebTokenError") {
        return res.status(500).json({
          success: false,
          message: "A technical issue occurred. Please try again later.",
        });
      }

      const isValidationError =
        error.message && error.message.startsWith("Validation failed:");
      const isDuplicateError =
        error.message && error.message.includes("already exists");

      return res
        .status(isValidationError ? 400 : isDuplicateError ? 409 : 500)
        .json({
          success: false,
          message: error.message || "Internal server error",
        });
    }
  }

  // Admin: Get active sessions and users
  async getActiveSessions(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      const activeData = await userService.getActiveSessionsAndUsers();
      res.status(200).json({
        success: true,
        data: activeData,
      });
    } catch (error) {
      console.error("Get active sessions error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Get detailed session information (for debugging)
  async getSessionDetails(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      const sessionDetails = await userService.getSessionDetails();
      res.status(200).json({
        success: true,
        data: sessionDetails,
      });
    } catch (error) {
      console.error("Get session details error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Invalidate a specific session by session token
  async invalidateSession(req, res) {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }
      const { sessionToken } = req.params;
      if (!sessionToken) {
        return res.status(400).json({
          success: false,
          message: "Session token is required",
        });
      }
      await redisClient.del(sessionToken);
      res.status(200).json({
        success: true,
        message: "Session invalidated successfully",
        sessionToken,
      });
    } catch (error) {
      console.error("Invalidate session error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Get user by email
      const user = await userService.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.status(200).json({
          success: true,
          message: "If the email exists, a password reset link has been sent.",
        });
      }

      // Generate password reset token
      const resetToken = require("crypto").randomBytes(32).toString("hex");
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token in database (you'll need to add this to your schema)
      // For now, we'll just send the email

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(
          user.email,
          `${user.firstName} ${user.lastName}`,
          resetToken
        );
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        return res.status(500).json({
          success: false,
          message:
            "Failed to send password reset email. Please try again later.",
        });
      }

      res.status(200).json({
        success: true,
        message: "If the email exists, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("Send password reset email error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new UserController();
