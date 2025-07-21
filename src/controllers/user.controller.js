const userService = require("../services/user.service");
const emailService = require("../services/email.service");

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
      // Send verification email (not welcome email)
      try {
        const jwt = require("jsonwebtoken");
        const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
        const verificationToken = jwt.sign(
          { email: newAdmin.email },
          JWT_SECRET,
          {
            expiresIn: "24h",
          }
        );
        await emailService.sendEmailVerification(
          newAdmin.email,
          `${newAdmin.firstName} ${newAdmin.lastName}`,
          verificationToken
        );
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }
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

  // Register doctor (admin or public)
  async registerDoctor(req, res) {
    try {
      const {
        email,
        firstName,
        lastName,
        password,
        specialization,
        phoneNumber,
        practiceId,
        licenseNumber,
        experience,
        bio,
      } = req.body;
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
        specialization,
        phoneNumber,
        practiceId,
        licenseNumber,
        experience,
        bio,
      };
      const newDoctor = await userService.registerDoctor(userData);
      // Send welcome email (non-blocking)
      try {
        await emailService.sendWelcomeEmail(
          newDoctor.email,
          `Dr. ${newDoctor.firstName} ${newDoctor.lastName}`
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
      res.status(201).json({
        success: true,
        message: "Doctor registered successfully",
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
          : "Could not register user. Please try again later.",
      });
    }
  }

  // Login endpoint
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }
      const { token, user } = await userService.loginUser(email, password);
      res.status(200).json({
        success: true,
        token,
        user,
      });
    } catch (error) {
      console.error("Login error:", error);
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

  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      const { page, limit, role, status, isActive, search } = req.query;
      const filters = { role, status, isActive, search };

      const result = await userService.getAllUsers(page, limit, filters);

      res.status(200).json({
        success: true,
        ...result,
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
}

module.exports = new UserController();
