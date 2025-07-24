const { eq, and, or, like, desc, asc, count, sql } = require("drizzle-orm");
const db = require("../db");
const { users } = require("../schema");
const { doctors, createDoctorData } = require("../schema/doctor");
const { admins } = require("../schema/admin");
const config = require("../config/config");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper function to create a new user object
const createUser = (userData) => {
  return {
    ...userData,
    id: nanoid(25),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function generateJWT(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

class UserService {
  constructor() {
    // Configuration constants
    this.DEFAULT_PAGE_SIZE = 10;
    this.MAX_PAGE_SIZE = 100;

    // Define allowed admin emails with fallback and better error handling
    this.ALLOWED_ADMIN_EMAILS = this.initializeAdminEmails();
  }

  // Initialize allowed admin emails from environment or config
  initializeAdminEmails() {
    // Only use environment variable, no fallbacks
    const envEmails = process.env.ALLOWED_ADMIN_EMAILS;
    if (envEmails) {
      return envEmails.split(",").map((email) => email.trim().toLowerCase());
    }
    throw new Error(
      "No admin emails configured. Please set ALLOWED_ADMIN_EMAILS environment variable."
    );
  }

  // Check if email is allowed to register (admin emails only)
  isEmailAllowedToRegister(email) {
    if (!email || typeof email !== "string") {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();
    return this.ALLOWED_ADMIN_EMAILS.includes(normalizedEmail);
  }

  // Validate user input data
  validateUserInput(userData) {
    const errors = [];

    if (!userData.email || typeof userData.email !== "string") {
      errors.push("Valid email is required");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push("Invalid email format");
      }
    }

    if (!userData.firstName || typeof userData.firstName !== "string") {
      errors.push("First name is required");
    }

    if (!userData.lastName || typeof userData.lastName !== "string") {
      errors.push("Last name is required");
    }

    return errors;
  }

  // Register a new admin
  async registerAdmin(userData) {
    // Validate input
    const validationErrors = this.validateUserInput(userData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }
    // Normalize email
    const normalizedEmail = userData.email.toLowerCase().trim();
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));
    if (existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }
    // Check if email is allowed
    if (!this.isEmailAllowedToRegister(normalizedEmail)) {
      throw new Error("Email is not authorized for admin registration");
    }
    // Hash password
    const passwordHash = await hashPassword(userData.password);
    const newUser = createUser({
      ...userData,
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      isActive: true,
      emailVerified: false,
      lastLoggedInAt: new Date(),
    });
    const transaction = await db.transaction(async (tx) => {
      try {
        const [insertedUser] = await tx
          .insert(users)
          .values(newUser)
          .returning();
        await tx.insert(admins).values({
          id: insertedUser.id,
          department: userData.department || null,
          permissions: userData.permissions || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const { passwordHash, ...userWithoutSensitive } = insertedUser;
        return userWithoutSensitive;
      } catch (error) {
        console.error("Transaction error during admin registration:", error);
        throw error;
      }
    });
    return transaction;
  }

  // Register a new doctor
  async registerDoctor(userData) {
    // Validate input
    const validationErrors = this.validateUserInput(userData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }
    // Normalize email
    const normalizedEmail = userData.email.toLowerCase().trim();
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));
    if (existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }
    // Hash password
    const passwordHash = await hashPassword(userData.password);
    const newUser = createUser({
      ...userData,
      email: normalizedEmail,
      passwordHash,
      role: "doctor",
      isActive: true,
      emailVerified: false,
      lastLoggedInAt: new Date(),
    });
    const transaction = await db.transaction(async (tx) => {
      try {
        const [insertedUser] = await tx
          .insert(users)
          .values(newUser)
          .returning();
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
        const { passwordHash, ...userWithoutSensitive } = insertedUser;
        return userWithoutSensitive;
      } catch (error) {
        console.error("Transaction error during doctor registration:", error);
        throw error;
      }
    });
    return transaction;
  }

  // Register a new user (legacy/general): delegates to admin or doctor registration
  async registerUser(userData) {
    // Determine role based on allowed admin emails
    const normalizedEmail = userData.email.toLowerCase().trim();
    if (this.isEmailAllowedToRegister(normalizedEmail)) {
      return this.registerAdmin(userData);
    } else {
      return this.registerDoctor(userData);
    }
  }

  // Login user
  async loginUser(email, password) {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));
    if (!user) throw new Error("User not found");
    if (!user.emailVerified)
      throw new Error(
        "Email not verified. Please verify your email before logging in."
      );
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new Error("Invalid credentials");
    const token = generateJWT(user);
    return { token, user };
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

      // Only strip sensitive data if includeSensitive is false
      if (user && !includeSensitive) {
        const { passwordHash, ...userWithoutSensitive } = user;
        return userWithoutSensitive;
      }

      // If includeSensitive is true, return full user object
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  // Get user by ID with improved error handling
  async getUserById(id, includeSensitive = false) {
    try {
      if (!id || typeof id !== "string") {
        throw new Error("Valid user ID is required");
      }

      const [user] = await db.select().from(users).where(eq(users.id, id));

      if (!user) {
        throw new Error("User not found");
      }

      // Only strip sensitive data if includeSensitive is false
      if (!includeSensitive) {
        const { passwordHash, ...userWithoutSensitive } = user;
        return userWithoutSensitive;
      }

      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required");
      }

      // Validate update data
      const allowedFields = [
        "firstName",
        "lastName",
        "address",
        "city",
        "state",
        "zip",
        "country",
        "profilePicture",
        "emailVerified", // allow updating emailVerified
      ];

      const filteredData = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          filteredData[key] = value;
        }
      }

      if (Object.keys(filteredData).length === 0) {
        throw new Error("No valid fields to update");
      }

      // Add updated timestamp
      filteredData.updatedAt = new Date();

      const [updatedUser] = await db
        .update(users)
        .set(filteredData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error("User not found");
      }

      // Return user without sensitive data
      const { passwordHash, ...userWithoutSensitive } = updatedUser;
      return userWithoutSensitive;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  // Delete user (soft delete)
  async deleteUser(id, reason = null, deletedBy = null) {
    try {
      if (!id || typeof id !== "string") {
        throw new Error("Valid user ID is required");
      }

      const [deletedUser] = await db
        .update(users)
        .set({
          isActive: false,
          status: "deleted",
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!deletedUser) {
        throw new Error("User not found");
      }

      console.log(
        `User deleted: ${deletedUser.email} by ${deletedBy || "system"}`
      );

      return { success: true, message: "User deleted successfully" };
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // Get all users with pagination and filtering
  async getAllUsers(page = 1, limit = 10, filters = {}) {
    try {
      // Validate pagination parameters
      const validatedPage = Math.max(1, parseInt(page) || 1);
      const validatedLimit = Math.min(
        this.MAX_PAGE_SIZE,
        Math.max(1, parseInt(limit) || this.DEFAULT_PAGE_SIZE)
      );
      const offset = (validatedPage - 1) * validatedLimit;

      // Build where conditions
      const whereConditions = [];

      if (filters.role) {
        whereConditions.push(eq(users.role, filters.role));
      }

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(users.isActive, filters.isActive));
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        whereConditions.push(
          or(
            like(users.firstName, searchTerm),
            like(users.lastName, searchTerm),
            like(users.email, searchTerm)
          )
        );
      }

      // Build query
      let query = db.select().from(users);

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      // Get total count
      const countQuery = db.select({ count: count() }).from(users);

      if (whereConditions.length > 0) {
        countQuery.where(and(...whereConditions));
      }

      const [{ count: totalCount }] = await countQuery;

      // Get paginated results
      const results = await query
        .orderBy(desc(users.createdAt))
        .limit(validatedLimit)
        .offset(offset);

      // Remove sensitive data from results
      const sanitizedResults = results.map((user) => {
        const { passwordHash, ...userWithoutSensitive } = user;
        return userWithoutSensitive;
      });

      return {
        users: sanitizedResults,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / validatedLimit),
        },
      };
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }

  // Toggle user status
  async toggleUserStatus(userId) {
    try {
      if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required");
      }

      // Get current user status
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!currentUser) {
        throw new Error("User not found");
      }

      // Toggle status
      const newStatus = currentUser.isActive ? false : true;
      const statusText = newStatus ? "active" : "inactive";

      const [updatedUser] = await db
        .update(users)
        .set({
          isActive: newStatus,
          status: statusText,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      console.log(`User status toggled: ${updatedUser.email} -> ${statusText}`);

      // Return user without sensitive data
      const { passwordHash, ...userWithoutSensitive } = updatedUser;
      return userWithoutSensitive;
    } catch (error) {
      console.error("Error toggling user status:", error);
      throw error;
    }
  }

  // Determine user role based on email
  determineUserRole(email) {
    if (!email || typeof email !== "string") {
      return "doctor"; // Default role
    }

    const normalizedEmail = email.toLowerCase().trim();
    return this.ALLOWED_ADMIN_EMAILS.includes(normalizedEmail)
      ? "admin"
      : "doctor";
  }

  // Get allowed admin emails
  getAllowedAdminEmails() {
    return [...this.ALLOWED_ADMIN_EMAILS];
  }

  static async syncFromSupabaseUser(user) {
    const db = require("../db");
    const { users } = require("../schema/user");
    let [localUser] = await db.select().from(users).where(users.id.eq(user.id));
    if (!localUser) {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        role: user.user_metadata?.role || "doctor",
        isActive: true,
        emailVerified: user.email_confirmed_at ? true : false,
        phoneNumber: user.user_metadata?.phone_number || "",
        lastLoggedInAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      [localUser] = await db.select().from(users).where(users.id.eq(user.id));
    } else {
      await db
        .update(users)
        .set({ lastLoggedInAt: new Date(), updatedAt: new Date() })
        .where(users.id.eq(user.id));
      [localUser] = await db.select().from(users).where(users.id.eq(user.id));
    }
    return localUser;
  }
}

module.exports = new UserService();
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
module.exports.generateJWT = generateJWT;
