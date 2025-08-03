const userService = require("../services/user.service");
const emailService = require("../services/email.service");
const { eq } = require("drizzle-orm");
const db = require("../db");
const { users, admins, departments } = require("../schema");

class UserController {
  // Register a new user
  async register(req, res) {
    try {
      const { email, firstName, lastName, password, phoneNumber } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName || !password || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message:
            "All fields are required: email, firstName, lastName, password, phoneNumber",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const userData = {
        email: normalizedEmail,
        firstName,
        lastName,
        password,
        phoneNumber,
      };

      // Determine role based on admin_email table
      const role = await userService.constructor.determineUserRoleByEmail(
        normalizedEmail
      );
      userData.role = role;

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

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: newUser,
          role: newUser.role,
          isAdmin: newUser.role === "admin",
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      const isValidationError =
        error.message && error.message.startsWith("Validation failed:");
      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Register a new admin
  async registerAdmin(req, res) {
    try {
      const {
        email,
        firstName,
        lastName,
        password,
        phoneNumber,
        department,
        permissions,
      } = req.body;
      // Validate required fields
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const userData = {
        email: normalizedEmail,
        firstName,
        lastName,
        password,
        phoneNumber,
        department,
        permissions,
      };
      const newAdmin = await userService.registerAdmin(userData);
      res.status(201).json({
        success: true,
        message:
          "Admin registered successfully. Please check your email to verify your account.",
        data: {
          user: newAdmin,
          role: newAdmin.role,
          isAdmin: true,
        },
      });
    } catch (error) {
      console.error("Admin registration error:", error);
      const isValidationError =
        error.message && error.message.startsWith("Validation failed:");
      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: isValidationError
          ? error.message
          : "Could not register user. Please try again later.",
      });
    }
  }

  // Register a new admin team member (for team management)
  async registerAdminMember(req, res) {
    try {
      const {
        email,
        firstName,
        lastName,
        phoneNumber,
        department,
        permissions,
        role = "admin", // Default to admin role
      } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: "All fields are required: email, firstName, lastName",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const userData = {
        email: normalizedEmail,
        firstName,
        lastName,
        phoneNumber,
        department,
        permissions,
        role: "admin", // Force admin role for team members
      };

      // Register the admin member (without password)
      const newAdminMember = await userService.registerAdminWithoutPassword(
        userData
      );

      // Generate verification token
      const verificationToken = userService.generateAccountVerificationToken(
        newAdminMember.id
      );

      // Send account verification email (non-blocking)
      try {
        await emailService.sendAccountVerificationEmail(
          newAdminMember.email,
          `${newAdminMember.firstName} ${newAdminMember.lastName}`,
          verificationToken,
          "team member"
        );
      } catch (emailError) {
        console.error("Failed to send account verification email:", emailError);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        success: true,
        message:
          "Team member registered successfully. A verification email has been sent to their email address.",
        data: {
          user: newAdminMember,
          role: newAdminMember.role,
          isAdmin: true,
        },
      });
    } catch (error) {
      console.error("Team member registration error:", error);
      const isValidationError =
        error.message && error.message.startsWith("Validation failed:");
      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: isValidationError
          ? error.message
          : "Could not register team member. Please try again later.",
      });
    }
  }

  // Register doctor (admin or public)
  async registerDoctor(req, res) {
    try {
      const {
        email,
        firstName,
        lastName,
        specialization,
        phoneNumber,
        practiceId,
        licenseNumber,
        experience,
        bio,
      } = req.body;
      // Validate required fields
      if (!email || !firstName || !lastName || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message:
            "All fields are required: email, firstName, lastName, phoneNumber",
        });
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const userData = {
        email: normalizedEmail,
        firstName,
        lastName,
        specialization,
        phoneNumber,
        practiceId,
        licenseNumber,
        experience,
        bio,
      };
      const newDoctor = await userService.registerDoctorWithoutPassword(
        userData
      );

      // Generate verification token
      const verificationToken = userService.generateAccountVerificationToken(
        newDoctor.id
      );

      // Send account verification email (non-blocking)
      try {
        await emailService.sendAccountVerificationEmail(
          newDoctor.email,
          `${newDoctor.firstName} ${newDoctor.lastName}`,
          verificationToken,
          "doctor"
        );
      } catch (emailError) {
        console.error("Failed to send account verification email:", emailError);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        success: true,
        message:
          "Doctor registered successfully. A verification email has been sent to their email address.",
        data: {
          user: newDoctor,
          role: newDoctor.role,
        },
      });
    } catch (error) {
      console.error("Doctor registration error:", error);
      const isValidationError =
        error.message && error.message.startsWith("Validation failed:");
      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: isValidationError
          ? error.message
          : "Could not register doctor. Please try again later.",
      });
    }
  }

  // Login endpoint
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

      console.log(`Login attempt from IP: ${clientIP}, Email: ${email}`);

      if (!email || !password) {
        console.log(`Login failed - Missing credentials from IP: ${clientIP}`);
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const { token, refreshToken, user } = await userService.loginUser(
        email,
        password
      );

      // Reset rate limit on successful login
      const { resetRateLimit } = require("../middleware/rateLimit.middleware");
      await resetRateLimit(req, res, () => {});

      console.log(
        `Successful login for user: ${user.email}, Role: ${user.role}, IP: ${clientIP}`
      );

      res.status(200).json({
        success: true,
        token,
        refreshToken,
        user,
      });
    } catch (error) {
      const clientIP = req.ip || req.connection.remoteAddress;
      console.error(
        `Login error from IP: ${clientIP}, Email: ${req.body.email}, Error: ${error.message}`
      );
      return res.status(401).json({
        success: false,
        message: error.message || "Invalid credentials",
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.params.id || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        user,
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

      const updatedUser = await userService.updateUserProfile(
        userId,
        updateData
      );

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Get all users with pagination and filtering
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, role, isActive } = req.query;
      const filters = {};

      if (search) filters.search = search;
      if (role) filters.role = role;
      if (isActive !== undefined) filters.isActive = isActive === "true";

      const result = await userService.getAllUsers(page, limit, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch users",
      });
    }
  }

  // Get team members (super admin only)
  async getTeamMembers(req, res) {
    try {
      const { page = 1, limit = 10, search, isActive } = req.query;
      const filters = {
        role: "admin", // Only get admin users
      };

      if (search) filters.search = search;
      if (isActive !== undefined) filters.isActive = isActive === "true";

      const result = await userService.getAllUsers(page, limit, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get team members error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch team members",
      });
    }
  }

  // Toggle user status (admin only)
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const result = await userService.toggleUserStatus(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json({
        success: true,
        message: "User status updated successfully",
        user: result.user,
      });
    } catch (error) {
      console.error("Toggle user status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Delete user (admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const result = await userService.deleteUser(id, reason, req.user?.id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
        deletedUser: result.deletedUser,
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get API status
  async getApiStatus(req, res) {
    try {
      const status = {
        status: "operational",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        features: {
          authentication: "supabase",
          database: "postgresql",
          email: "nodemailer",
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error("API status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Check email registration status
  async checkEmailRegistration(req, res) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email parameter is required",
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

  // Get allowed admin emails (admin only)
  async getAllowedAdminEmails(req, res) {
    try {
      const result = userService.getAllowedAdminEmails();

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get allowed admin emails error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Verify email endpoint
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;
      if (!token) {
        return res
          .status(400)
          .json({ success: false, message: "Verification token is required" });
      }
      // Decode and verify the token (assume JWT for simplicity)
      const jwt = require("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
        });
      }
      // Find user by email in payload
      const user = await userService.getUserByEmail(payload.email, true);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      // Mark email as verified
      await userService.updateUserProfile(user.id, { emailVerified: true });
      // Send welcome email after verification
      try {
        await emailService.sendWelcomeEmail(
          user.email,
          `${user.firstName} ${user.lastName}`
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
      return res
        .status(200)
        .json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Set initial password endpoint (for team members and doctors)
  async setInitialPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: "Token and password are required",
        });
      }

      const result = await userService.setInitialPassword(token, password);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: { user: result.user },
      });
    } catch (error) {
      console.error("Set initial password error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to set initial password",
      });
    }
  }

  // Resend verification email endpoint
  async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });
      }
      const user = await userService.getUserByEmail(email, true);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      if (user.emailVerified) {
        return res
          .status(400)
          .json({ success: false, message: "Email is already verified" });
      }
      // Generate a new verification token (JWT with email)
      const jwt = require("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
      const verificationToken = jwt.sign({ email: user.email }, JWT_SECRET, {
        expiresIn: "24h",
      });
      // Send verification email
      await emailService.sendEmailVerification(
        user.email,
        `${user.firstName} ${user.lastName}`,
        verificationToken
      );
      return res
        .status(200)
        .json({ success: true, message: "Verification email sent" });
    } catch (error) {
      console.error("Resend verification email error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Change password (requires authentication)
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id; // From auth middleware

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }

      // Get user with password hash
      const user = await userService.getUserByEmail(req.user.email, true);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const bcrypt = require("bcrypt");
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Update password with history validation
      await userService.updateUserPassword(userId, newPassword);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to change password",
      });
    }
  }

  // Get password requirements
  async getPasswordRequirements(req, res) {
    try {
      const requirements = userService.getPasswordRequirements();
      res.json({
        success: true,
        data: requirements,
      });
    } catch (error) {
      console.error("Get password requirements error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get password requirements",
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      // Verify refresh token using the correct secret
      const jwt = require("jsonwebtoken");
      const JWT_REFRESH_SECRET =
        process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";

      let payload;
      try {
        payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
        });
      }

      // Verify refresh token exists in Redis
      const redisClient = require("../utils/redis");
      const storedUserId = await redisClient.get(refreshToken);
      if (!storedUserId || storedUserId !== payload.id.toString()) {
        return res.status(401).json({
          success: false,
          message: "Refresh token not found or invalid",
        });
      }

      // Get user from database
      const user = await userService.getUserById(payload.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          token: accessToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isEmailVerified: user.emailVerified,
          },
        },
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Logout endpoint
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Remove refresh token from Redis
        const redisClient = require("../utils/redis");
        await redisClient.del(refreshToken);
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

  // Debug endpoint to check user's department data
  async debugUserDepartment(req, res) {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Forbidden: admin access required",
        });
      }

      const userId = req.user.id;

      // Get raw user data
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId));

      // Get admin record
      const [adminRecord] = await db
        .select({
          id: admins.id,
          departmentId: admins.departmentId,
        })
        .from(admins)
        .where(eq(admins.id, userId));

      // Get department record
      let departmentRecord = null;
      if (adminRecord) {
        [departmentRecord] = await db
          .select({
            id: departments.id,
            name: departments.name,
          })
          .from(departments)
          .where(eq(departments.id, adminRecord.departmentId));
      }

      // Get all departments for reference
      const allDepartments = await db
        .select({
          id: departments.id,
          name: departments.name,
        })
        .from(departments);

      res.json({
        success: true,
        data: {
          user,
          adminRecord,
          departmentRecord,
          allDepartments,
          debug: {
            hasUser: !!user,
            hasAdminRecord: !!adminRecord,
            hasDepartmentRecord: !!departmentRecord,
            departmentId: adminRecord?.departmentId,
            departmentName: departmentRecord?.name,
          },
        },
      });
    } catch (error) {
      console.error("Debug user department error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new UserController();
