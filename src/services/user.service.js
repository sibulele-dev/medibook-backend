const { eq, and, or, like, desc, asc, count, sql } = require("drizzle-orm");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");
const redisClient = require("../config/redis");
const {
  users,
  loginAttempts,
  refreshTokens,
  userSessions,
  createUser,
  isAdminEmail,
} = require("../schema");
const config = require("../config/config");
const { doctors, createDoctorData } = require("../schema/doctor");
const { admins } = require("../schema/admin");

class UserService {
  constructor() {
    // Configuration constants
    this.SALT_ROUNDS = 12;
    this.TOKEN_LENGTH = 32;
    this.DEFAULT_PAGE_SIZE = 10;
    this.MAX_PAGE_SIZE = 100;

    // Define allowed admin emails with fallback and better error handling
    this.ALLOWED_ADMIN_EMAILS = this.initializeAdminEmails();
  }

  // Initialize admin emails with better error handling and fallback
  initializeAdminEmails() {
    try {
      let adminEmails = [];
      if (process.env.ALLOWED_ADMIN_EMAILS) {
        adminEmails = process.env.ALLOWED_ADMIN_EMAILS.split(",").map((email) =>
          email.trim().toLowerCase()
        );
      } else {
        adminEmails = [];
      }
      return adminEmails;
    } catch (error) {
      console.error("Error initializing admin emails:", error);
      return [];
    }
  }

  // Input validation helper
  validateUserInput(userData, isUpdate = false) {
    const errors = [];

    if (!isUpdate && !userData.email) {
      errors.push("Email is required");
    }

    if (userData.email && !this.isValidEmail(userData.email)) {
      errors.push("Invalid email format");
    }

    if (!isUpdate && !userData.password) {
      errors.push("Password is required");
    }

    if (userData.password) {
      if (userData.password.length < 8) {
        errors.push("Password must be at least 8 characters long.");
      }
      if (!/[A-Z]/.test(userData.password)) {
        errors.push("Password must include at least one uppercase letter.");
      }
      if (!/[a-z]/.test(userData.password)) {
        errors.push("Password must include at least one lowercase letter.");
      }
      if (!/[0-9]/.test(userData.password)) {
        errors.push("Password must include at least one number.");
      }
      if (!/[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]/.test(userData.password)) {
        errors.push("Password must include at least one special character.");
      }
    }

    return errors;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Register a new user with improved validation
  async registerUser(userData) {
    // Validate input
    const validationErrors = this.validateUserInput(userData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    // Check if email is allowed to register (only admin emails)
    const normalizedEmail = userData.email.toLowerCase().trim();
    if (!this.isEmailAllowedToRegister(normalizedEmail)) {
      throw new Error(
        "Registration is restricted to authorized admin emails only"
      );
    }

    const transaction = await db.transaction(async (tx) => {
      try {
        // Debug log for role determination
        console.log("Registering user with email:", normalizedEmail);
        console.log("Available admin emails:", this.ALLOWED_ADMIN_EMAILS);

        // Check if user already exists
        const existingUser = await tx
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail));

        if (existingUser.length > 0) {
          throw new Error("User with this email already exists");
        }

        // Hash password with configured salt rounds
        const hashedPassword = await bcrypt.hash(
          userData.password,
          this.SALT_ROUNDS
        );

        // Determine role based on email with debug logging
        const role = this.determineUserRole(normalizedEmail);
        console.log("Determined role for", normalizedEmail, ":", role);

        // Generate secure email verification token
        const emailVerificationToken = crypto
          .randomBytes(this.TOKEN_LENGTH)
          .toString("hex");
        const emailVerificationExpires = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ); // 24 hours

        // Create user with automatic role assignment
        const newUser = createUser({
          ...userData,
          email: normalizedEmail,
          password: hashedPassword,
          role,
          emailVerificationToken,
          emailVerificationExpires,
          emailVerified: false,
          isActive: true,
          status: "pending_verification", // Better initial status
          loginAttempts: 0,
          lastLoginAttempt: null,
          passwordChangedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Insert user into database
        const [insertedUser] = await tx
          .insert(users)
          .values(newUser)
          .returning();

        // Add to doctors table if role is doctor
        if (role === "doctor") {
          const doctorData = createDoctorData({
            userId: insertedUser.id,
            specialization: userData.specialization || "General Practice",
            phoneNumber: userData.phoneNumber || "",
            practiceId: userData.practiceId || "",
            licenseNumber: userData.licenseNumber || null,
            experience: userData.experience || null,
            bio: userData.bio || null,
            isActive: true,
          });
          await tx.insert(doctors).values(doctorData);
        }

        // Add to admins table if role is admin
        if (role === "admin") {
          await tx.insert(admins).values({
            id: require("nanoid").nanoid(30),
            userId: insertedUser.id,
            department: userData.department || null,
            permissions: userData.permissions || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Log user creation for audit (consider using proper logging service)
        console.log(
          `User created: ${insertedUser.email} with role: ${insertedUser.role}`
        );

        // Return user without sensitive data
        const { password, ...userWithoutPassword } = insertedUser;
        return {
          ...userWithoutPassword,
          emailVerificationRequired: true,
        };
      } catch (error) {
        console.error("Error in registerUser transaction:", error);
        throw error;
      }
    });

    return transaction;
  }

  // Check if email is allowed to register (only admin emails)
  isEmailAllowedToRegister(email) {
    const normalizedEmail = email.toLowerCase().trim();
    return this.ALLOWED_ADMIN_EMAILS.includes(normalizedEmail);
  }

  // Register a new doctor (admin only)
  async registerDoctor(userData, registeredByAdminId) {
    // Validate input
    const validationErrors = this.validateUserInput(userData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    const transaction = await db.transaction(async (tx) => {
      try {
        // Normalize email to lowercase
        const normalizedEmail = userData.email.toLowerCase().trim();

        // Check if user already exists
        const existingUser = await tx
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail));

        if (existingUser.length > 0) {
          throw new Error("User with this email already exists");
        }

        // Hash password with configured salt rounds
        const hashedPassword = await bcrypt.hash(
          userData.password,
          this.SALT_ROUNDS
        );

        // Generate secure email verification token
        const emailVerificationToken = crypto
          .randomBytes(this.TOKEN_LENGTH)
          .toString("hex");
        const emailVerificationExpires = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ); // 24 hours

        // Create doctor user (always doctor role for this method)
        const newDoctor = createUser({
          ...userData,
          email: normalizedEmail,
          password: hashedPassword,
          role: "doctor", // Always doctor role for this method
          emailVerificationToken,
          emailVerificationExpires,
          emailVerified: false,
          isActive: true,
          status: "pending_verification",
          loginAttempts: 0,
          lastLoginAttempt: null,
          passwordChangedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Insert doctor into database
        const [insertedDoctor] = await tx
          .insert(users)
          .values(newDoctor)
          .returning();

        // Log doctor creation for audit
        console.log(
          `Doctor created: ${insertedDoctor.email} by admin: ${registeredByAdminId}`
        );

        // Return doctor without sensitive data
        const { password, ...doctorWithoutPassword } = insertedDoctor;
        return {
          ...doctorWithoutPassword,
          emailVerificationRequired: true,
        };
      } catch (error) {
        console.error("Error in registerDoctor transaction:", error);
        throw error;
      }
    });

    return transaction;
  }

  // Get user by email with improved error handling
  async getUserByEmail(email, includeSensitive = false) {
    try {
      if (!email || typeof email !== "string") {
        throw new Error("Valid email is required");
      }

      const normalizedEmail = email.toLowerCase().trim();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail));

      // Only strip password if includeSensitive is false
      if (user && !includeSensitive) {
        const { password, emailVerificationToken, ...userWithoutPassword } =
          user;
        return userWithoutPassword;
      }

      // If includeSensitive is true, return full user object (including password)
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  // Get user by ID with improved error handling
  async getUserById(id, includeSensitive = false) {
    try {
      if (!id) {
        throw new Error("User ID is required");
      }

      const [user] = await db.select().from(users).where(eq(users.id, id));

      if (user && !includeSensitive) {
        const { password, emailVerificationToken, ...userWithoutPassword } =
          user;
        return userWithoutPassword;
      }

      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  // Get user profile (without sensitive data) - unchanged but improved
  async getUserProfile(id) {
    try {
      if (!id) {
        throw new Error("User ID is required");
      }

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phoneNumber,
          dateOfBirth: users.dateOfBirth,
          address: users.address,
          profilePicture: users.profilePicture,
          bio: users.bio,
          specialization: users.specialization,
          role: users.role,
          isActive: users.isActive,
          status: users.status,
          emailVerified: users.emailVerified,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, id));

      return user;
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw error;
    }
  }

  // Update user with improved validation
  async updateUser(id, updateData) {
    try {
      if (!id) {
        throw new Error("User ID is required");
      }

      // Validate update data
      const validationErrors = this.validateUserInput(updateData, true);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
      }

      // Check if user exists
      const existingUser = await this.getUserById(id, true);
      if (!existingUser) {
        return null;
      }

      // Email validation if being updated
      if (updateData.email) {
        const normalizedEmail = updateData.email.toLowerCase().trim();
        const userWithEmail = await this.getUserByEmail(normalizedEmail);
        if (userWithEmail && userWithEmail.id !== id) {
          throw new Error("Email already in use by another user");
        }
        updateData.email = normalizedEmail;

        // If email is changed, require re-verification
        if (normalizedEmail !== existingUser.email) {
          updateData.emailVerified = false;
          updateData.emailVerificationToken = crypto
            .randomBytes(this.TOKEN_LENGTH)
            .toString("hex");
          updateData.emailVerificationExpires = new Date(
            Date.now() + 24 * 60 * 60 * 1000
          );
        }
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) {
        return null;
      }

      const { password, emailVerificationToken, ...userWithoutPassword } =
        updatedUser;
      return userWithoutPassword;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  // Enhanced password change with better security
  async changePassword(userId, currentPassword, newPassword) {
    try {
      if (!userId || !currentPassword || !newPassword) {
        return {
          success: false,
          message: "All fields are required",
          code: "MISSING_FIELDS",
        };
      }

      if (newPassword.length < 8) {
        return {
          success: false,
          message: "New password must be at least 8 characters long",
          code: "WEAK_PASSWORD",
        };
      }

      // Get user with current password
      const user = await this.getUserById(userId, true);
      if (!user) {
        return {
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        };
      }

      // Check if account is active
      if (!user.isActive || user.status !== "active") {
        return {
          success: false,
          message: "Account is not active",
          code: "ACCOUNT_INACTIVE",
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: "Current password is incorrect",
          code: "INVALID_CURRENT_PASSWORD",
        };
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return {
          success: false,
          message: "New password must be different from current password",
          code: "SAME_PASSWORD",
        };
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(
        newPassword,
        this.SALT_ROUNDS
      );

      // Update password and set passwordChangedAt
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date(),
          loginAttempts: 0, // Reset failed login attempts
        })
        .where(eq(users.id, userId));

      // Invalidate all sessions for this user for security (both refresh tokens and Redis sessions)
      await this.invalidateAllUserSessions(userId);

      console.log(`Password changed for user: ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  // Enhanced last login update with session tracking
  async updateLastLogin(userId, ipAddress = null, userAgent = null) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const updateData = {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
        loginAttempts: 0, // Reset failed attempts on successful login
      };

      if (ipAddress) {
        updateData.lastLoginIp = ipAddress;
      }

      await db.update(users).set(updateData).where(eq(users.id, userId));

      // Optionally create session record
      if (ipAddress || userAgent) {
        await this.createUserSession(userId, ipAddress, userAgent);
      }
    } catch (error) {
      console.error("Error updating last login:", error);
      // Don't throw error as this is not critical for login flow
    }
  }

  // Create user session record
  async createUserSession(userId, ipAddress, userAgent) {
    try {
      await db.insert(userSessions).values({
        userId,
        ipAddress,
        userAgent,
        loginAt: new Date(),
        isActive: true,
      });
    } catch (error) {
      console.error("Error creating user session:", error);
      // Non-critical, don't throw
    }
  }

  // Enhanced user deletion with cascade handling
  async deleteUser(id, reason = null, deletedBy = null) {
    if (!id) {
      throw new Error("User ID is required");
    }

    const transaction = await db.transaction(async (tx) => {
      try {
        // Check if user exists
        const user = await this.getUserById(id);
        if (!user) {
          return {
            success: false,
            message: "User not found",
            code: "USER_NOT_FOUND",
          };
        }

        // Delete related records first (cascade delete)
        await tx
          .delete(loginAttempts)
          .where(eq(loginAttempts.email, user.email));
        await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
        await tx.delete(userSessions).where(eq(userSessions.userId, id));

        // Delete user
        await tx.delete(users).where(eq(users.id, id));

        // Log deletion for audit trail
        console.log(
          `User deleted: ${user.email}${reason ? ` - Reason: ${reason}` : ""}${
            deletedBy ? ` - Deleted by: ${deletedBy}` : ""
          }`
        );

        return {
          success: true,
          deletedUser: { id: user.id, email: user.email },
        };
      } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
      }
    });

    // Clean up Redis sessions after successful database deletion
    try {
      await this.invalidateAllUserRedisSessions(id);
    } catch (error) {
      console.error(
        "Error cleaning up Redis sessions during user deletion:",
        error
      );
      // Non-critical, don't throw
    }

    return transaction;
  }

  // Enhanced user listing with improved filtering
  async getAllUsers(filters = {}) {
    try {
      let {
        page = 1,
        limit = this.DEFAULT_PAGE_SIZE,
        search,
        role,
        status,
        isActive,
      } = filters;

      // Validate and sanitize pagination
      page = Math.max(1, parseInt(page) || 1);
      limit = Math.min(
        this.MAX_PAGE_SIZE,
        Math.max(1, parseInt(limit) || this.DEFAULT_PAGE_SIZE)
      );
      const offset = (page - 1) * limit;

      // Build where conditions
      let whereConditions = [];

      if (search && typeof search === "string") {
        const searchTerm = search.trim();
        if (searchTerm) {
          whereConditions.push(
            or(
              like(users.firstName, `%${searchTerm}%`),
              like(users.lastName, `%${searchTerm}%`),
              like(users.email, `%${searchTerm}%`)
            )
          );
        }
      }

      if (role && typeof role === "string") {
        whereConditions.push(eq(users.role, role));
      }

      if (status && typeof status === "string") {
        whereConditions.push(eq(users.status, status));
      }

      if (typeof isActive === "boolean") {
        whereConditions.push(eq(users.isActive, isActive));
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const [{ totalCount }] = await db
        .select({ totalCount: count() })
        .from(users)
        .where(whereClause);

      // Get users
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phoneNumber,
          role: users.role,
          isActive: users.isActive,
          status: users.status,
          emailVerified: users.emailVerified,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        users: allUsers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          pageSize: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }

  // Complete the updateUserStatus method that was cut off
  async updateUserStatus(userId, status, reason = null, adminId = null) {
    try {
      if (!userId || !status) {
        throw new Error("User ID and status are required");
      }

      const user = await this.getUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        };
      }

      const updateData = {
        status,
        isActive: status === "active",
        updatedAt: new Date(),
      };

      // If suspending/deactivating, invalidate Redis sessions only
      if (status !== "active") {
        await this.invalidateAllUserRedisSessions(userId);
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      // Log status change for audit
      console.log(
        `User status updated: ${user.email} -> ${status}${
          reason ? ` - Reason: ${reason}` : ""
        }${adminId ? ` - By admin: ${adminId}` : ""}`
      );

      const { password, emailVerificationToken, ...userWithoutPassword } =
        updatedUser;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error("Error updating user status:", error);
      throw error;
    }
  }

  // Toggle user status (activate/deactivate)
  async toggleUserStatus(userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const user = await this.getUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        };
      }

      const newStatus = user.isActive ? "inactive" : "active";
      const newIsActive = !user.isActive;

      const updateData = {
        isActive: newIsActive,
        status: newStatus,
        updatedAt: new Date(),
      };

      // If deactivating, invalidate Redis sessions only
      if (!newIsActive) {
        await this.invalidateAllUserRedisSessions(userId);
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      // Log status change for audit
      console.log(
        `User status toggled: ${user.email} -> ${newStatus} (isActive: ${newIsActive})`
      );

      const { password, emailVerificationToken, ...userWithoutPassword } =
        updatedUser;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error("Error toggling user status:", error);
      throw error;
    }
  }

  // Helper method to invalidate all Redis sessions for a user
  async invalidateAllUserRedisSessions(userId) {
    try {
      // Get all session tokens for this user from Redis
      // Note: This is a simplified approach. In production, you might want to maintain
      // a mapping of user ID to session tokens for more efficient cleanup
      const keys = await redisClient.keys("*");
      const sessionTokensToDelete = [];

      for (const key of keys) {
        const value = await redisClient.get(key);
        if (value === userId) {
          sessionTokensToDelete.push(key);
        }
      }

      // Delete all session tokens for this user
      if (sessionTokensToDelete.length > 0) {
        await redisClient.del(...sessionTokensToDelete);
        console.log(
          `Deleted ${sessionTokensToDelete.length} Redis sessions for user`
        );
      }
    } catch (error) {
      console.error("Error invalidating Redis sessions:", error);
      // Non-critical, don't throw
    }
  }

  // Enhanced method to invalidate all user sessions (Redis sessions only)
  async invalidateAllUserSessions(userId) {
    try {
      // Only clear Redis sessions to avoid Drizzle ORM errors
      await this.invalidateAllUserRedisSessions(userId);
      console.log("All Redis sessions invalidated for user");
    } catch (error) {
      console.error("Error invalidating user sessions:", error);
      // Non-critical, don't throw
    }
  }

  // Email verification methods
  async verifyEmail(token) {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.emailVerificationToken, token),
            eq(users.emailVerified, false)
          )
        );

      if (!user) {
        return {
          success: false,
          message: "Invalid or expired verification token",
          code: "INVALID_TOKEN",
        };
      }

      // Check if token is expired
      if (
        user.emailVerificationExpires &&
        new Date() > user.emailVerificationExpires
      ) {
        return {
          success: false,
          message: "Verification token has expired",
          code: "TOKEN_EXPIRED",
        };
      }

      // Update user as verified
      await db
        .update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          status: "active", // Activate account after email verification
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      console.log(`Email verified for user: ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error("Error verifying email:", error);
      throw error;
    }
  }

  // Resend email verification
  async resendEmailVerification(email) {
    try {
      const user = await this.getUserByEmail(email, true);
      if (!user) {
        return {
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          message: "Email is already verified",
          code: "ALREADY_VERIFIED",
        };
      }

      // Generate new verification token
      const emailVerificationToken = crypto
        .randomBytes(this.TOKEN_LENGTH)
        .toString("hex");
      const emailVerificationExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );

      await db
        .update(users)
        .set({
          emailVerificationToken,
          emailVerificationExpires,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return { success: true, token: emailVerificationToken };
    } catch (error) {
      console.error("Error resending email verification:", error);
      throw error;
    }
  }

  // FIXED: Helper function to determine user role based on email
  determineUserRole(email) {
    const normalizedEmail = email.toLowerCase().trim();

    // Debug logging
    console.log("Determining role for email:", normalizedEmail);
    console.log("Checking against admin emails:", this.ALLOWED_ADMIN_EMAILS);

    const isAdmin = this.ALLOWED_ADMIN_EMAILS.includes(normalizedEmail);
    console.log("Is admin?", isAdmin);

    return isAdmin ? "admin" : "doctor";
  }

  // Add method to verify password (missing from original code)
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  }

  // Cleanup all sessions except the specified session (for admin cleanup)
  async cleanupAllSessionsExcept(preserveSessionToken) {
    try {
      const keys = await redisClient.keys("*");
      let cleanedCount = 0;
      const sessionsToDelete = [];

      // Filter out the session to preserve
      for (const key of keys) {
        if (key !== preserveSessionToken) {
          sessionsToDelete.push(key);
        }
      }

      // Delete all sessions except the preserved one
      if (sessionsToDelete.length > 0) {
        await redisClient.del(...sessionsToDelete);
        cleanedCount = sessionsToDelete.length;
        console.log(
          `Cleaned up ${cleanedCount} sessions from Redis (preserved admin session)`
        );
      }

      return cleanedCount;
    } catch (error) {
      console.error("Error cleaning up all sessions except admin:", error);
      return 0;
    }
  }

  // Cleanup all sessions (for testing or emergency)
  async cleanupAllSessions() {
    try {
      const keys = await redisClient.keys("*");
      let cleanedCount = 0;

      if (keys.length > 0) {
        await redisClient.del(...keys);
        cleanedCount = keys.length;
        console.log(`Cleaned up ALL ${cleanedCount} sessions from Redis`);
      }

      return cleanedCount;
    } catch (error) {
      console.error("Error cleaning up all sessions:", error);
      return 0;
    }
  }

  // Cleanup expired sessions from Redis
  async cleanupExpiredSessions() {
    try {
      const keys = await redisClient.keys("*");
      let cleanedCount = 0;

      for (const key of keys) {
        // Check if the key has an expiry time set
        const ttl = await redisClient.ttl(key);

        // If TTL is -2, the key doesn't exist (already expired)
        // If TTL is -1, the key has no expiry (remove it for security)
        // If TTL is 0 or positive, the key is still valid
        if (ttl === -2) {
          // Key doesn't exist, skip
          continue;
        } else if (ttl === -1) {
          // Key has no expiry, remove it for security
          await redisClient.del(key);
          cleanedCount++;
          console.log("Removed session with no expiry");
        } else if (ttl === 0) {
          // Key has expired (TTL = 0), remove it
          await redisClient.del(key);
          cleanedCount++;
          console.log("Removed expired session");
        }
        // If TTL > 0, the session is still valid, keep it
      }

      console.log(`Cleaned up ${cleanedCount} expired sessions from Redis`);
      return cleanedCount;
    } catch (error) {
      console.error("Error cleaning up expired sessions:", error);
      return 0;
    }
  }

  // Get session statistics for monitoring
  async getSessionStats() {
    try {
      const keys = await redisClient.keys("*");
      const sessionCount = keys.length;

      // Get unique user count
      const userIds = new Set();
      for (const key of keys) {
        const value = await redisClient.get(key);
        if (value) {
          userIds.add(value);
        }
      }

      return {
        totalSessions: sessionCount,
        uniqueUsers: userIds.size,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting session stats:", error);
      return {
        totalSessions: 0,
        uniqueUsers: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  // Test database connection
  async testDatabaseConnection() {
    try {
      const result = await db.select({ connected: sql`1` });
      return result && result[0] && result[0].connected === 1;
    } catch (error) {
      console.error("Database connection test failed:", error);
      throw error;
    }
  }

  // Get active sessions and users for session management
  async getActiveSessionsAndUsers() {
    try {
      // Get all Redis session keys
      const keys = await redisClient.keys("*");
      const sessions = [];
      const userIds = new Set();

      // Process each session
      for (const key of keys) {
        const userId = await redisClient.get(key);
        if (userId) {
          userIds.add(userId);
          sessions.push({
            id: key,
            userId: userId,
            isActive: true,
            loginTime: new Date().toISOString(), // Approximate since we don't store timestamps
          });
        }
      }

      // Get user details for active users
      const users = [];
      for (const userId of userIds) {
        try {
          const user = await this.getUserById(userId);
          if (user) {
            users.push({
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              lastLoginAt: user.lastLoginAt || new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`Error getting user ${userId}:`, error);
        }
      }

      // Add user email to sessions
      const sessionsWithUserEmail = sessions.map((session) => {
        const user = users.find((u) => u.id === session.userId);
        return {
          ...session,
          userEmail: user?.email || "Unknown",
        };
      });

      return {
        sessions: sessionsWithUserEmail,
        users: users,
        totalSessions: sessions.length,
        totalUsers: users.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting active sessions and users:", error);
      return {
        sessions: [],
        users: [],
        totalSessions: 0,
        totalUsers: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  // Get detailed session information for debugging
  async getSessionDetails() {
    try {
      const keys = await redisClient.keys("*");
      const sessionDetails = [];

      for (const key of keys) {
        const userId = await redisClient.get(key);
        const ttl = await redisClient.ttl(key);

        if (userId) {
          sessionDetails.push({
            sessionToken: key,
            userId: userId,
            ttl: ttl,
            expiresAt:
              ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null,
            isExpired: ttl <= 0,
            createdAt: new Date().toISOString(), // Approximate
          });
        }
      }

      return {
        totalSessions: sessionDetails.length,
        sessions: sessionDetails,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting session details:", error);
      return {
        totalSessions: 0,
        sessions: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  // Emergency: Clear all sessions (for security breaches)
  async clearAllSessions() {
    try {
      console.log("EMERGENCY: Clearing all sessions due to security breach");

      // Get initial session count
      const initialKeys = await redisClient.keys("*");
      const initialCount = initialKeys.length;
      console.log(`Found ${initialCount} sessions to clear`);

      let clearedCount = 0;

      // Clear all Redis sessions
      try {
        if (initialKeys.length > 0) {
          await redisClient.del(...initialKeys);
          clearedCount = initialKeys.length;
          console.log(`Cleared ${clearedCount} Redis sessions`);
        }
      } catch (redisError) {
        console.error("Error clearing Redis sessions:", redisError);
        throw redisError;
      }

      // Verify all sessions are cleared
      const remainingKeys = await redisClient.keys("*");
      const remainingCount = remainingKeys.length;

      if (remainingCount > 0) {
        console.error(
          `WARNING: ${remainingCount} sessions still remain after cleanup`
        );
        // Try to clear remaining sessions
        await redisClient.del(...remainingKeys);
        console.log(`Cleared additional ${remainingCount} remaining sessions`);
        clearedCount += remainingCount;
      }

      // Final verification
      const finalKeys = await redisClient.keys("*");
      const finalCount = finalKeys.length;

      console.log(
        `EMERGENCY: Cleared ${clearedCount} Redis sessions due to security breach. Final count: ${finalCount} sessions.`
      );

      return {
        success: true,
        clearedRedisSessions: clearedCount,
        initialSessions: initialCount,
        remainingSessions: finalCount,
        allCleared: finalCount === 0,
        message: "All sessions cleared due to security breach",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error clearing all sessions:", error);
      throw error;
    }
  }
}

module.exports = new UserService();
