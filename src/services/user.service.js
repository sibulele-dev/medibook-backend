const { eq, and, or, like, desc, asc, count, sql } = require("drizzle-orm");
const db = require("../db");
const {
  users,
  doctors,
  admins,
  departments,
  passwordHistory,
} = require("../schema");
const config = require("../config/config");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const emailService = require("./email.service");
const {
  validatePasswordComprehensive,
  getPasswordRequirements,
  validatePassword,
} = require("../utils/passwordValidation");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper function to create a new user object
const createUser = (userData) => {
  return {
    ...userData,
    id: nanoid(25),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// Helper function to create doctor data
const createDoctorData = (doctorData) => {
  return {
    ...doctorData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

function generateVerificationToken(email) {
  return jwt.sign({ email: email }, JWT_SECRET, { expiresIn: "24h" });
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

  // Check if email should be assigned super_admin department (all allowed admin emails are super admins)
  isSuperAdminEmail(email) {
    if (!email || typeof email !== "string") {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();
    return this.ALLOWED_ADMIN_EMAILS.includes(normalizedEmail);
  }

  // Get department ID by name
  async getDepartmentIdByName(departmentName) {
    try {
      const result = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.name, departmentName))
        .limit(1);

      return result[0]?.id || null;
    } catch (error) {
      console.error("Error getting department ID:", error);
      return null;
    }
  }

  // Seed departments if they don't exist
  async seedDepartments() {
    try {
      const departmentNames = [
        "super_admin",
        "onboarding",
        "sales",
        "support",
        "billing_accounts",
        "compliance",
      ];
      const departmentPrivileges = {
        super_admin: ["full_access"],
        onboarding: ["add_practices", "add_doctors", "verify_doctor_details"],
        sales: ["communicate_potential_users", "view_adoption_funnel"],
        support: ["help_technical_issues", "reset_doctor_access"],
        billing_accounts: [
          "manage_subscriptions",
          "view_update_billing",
          "send_invoices",
        ],
        compliance: [
          "verify_credentials",
          "approve_hpcsa_bhf",
          "manage_document_verification",
        ],
      };

      for (const deptName of departmentNames) {
        const existingDept = await this.getDepartmentIdByName(deptName);
        if (!existingDept) {
          await db.insert(departments).values({
            id: nanoid(25),
            name: deptName,
            privileges: departmentPrivileges[deptName] || [
              "help_technical_issues",
            ],
          });
          console.log(`Created department: ${deptName}`);
        }
      }
    } catch (error) {
      console.error("Error seeding departments:", error);
    }
  }

  // Validate user input
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

    if (!userData.password || typeof userData.password !== "string") {
      errors.push("Password is required");
    }

    return errors;
  }

  // Validate user input without password (for team members)
  validateUserInputWithoutPassword(userData) {
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

  // Get password requirements
  getPasswordRequirements() {
    return getPasswordRequirements();
  }

  // Get user's password history
  async getPasswordHistory(userId) {
    try {
      const history = await db
        .select()
        .from(passwordHistory)
        .where(eq(passwordHistory.userId, userId))
        .orderBy(desc(passwordHistory.createdAt));

      return history;
    } catch (error) {
      console.error("Error getting password history:", error);
      return [];
    }
  }

  // Store password in history
  async storePasswordInHistory(userId, passwordHash) {
    try {
      await db.insert(passwordHistory).values({
        userId: userId,
        passwordHash: passwordHash,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error storing password in history:", error);
    }
  }

  // Update user password with history tracking
  async updateUserPassword(userId, newPassword) {
    try {
      // Get password history
      const historicalPasswords = await this.getPasswordHistory(userId);

      // Validate new password
      const validation = await validatePasswordComprehensive(
        newPassword,
        historicalPasswords
      );
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update user password
      const [updatedUser] = await db
        .update(users)
        .set({
          passwordHash: passwordHash,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error("User not found");
      }

      // Store new password in history
      await this.storePasswordInHistory(userId, passwordHash);

      return { success: true, message: "Password updated successfully" };
    } catch (error) {
      console.error("Error updating user password:", error);
      throw error;
    }
  }

  // Set initial password for team members and doctors
  async setInitialPassword(verificationToken, newPassword) {
    try {
      // Decode and verify the token
      const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Check if user exists and is not verified
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.emailVerified) {
        throw new Error("Account is already verified");
      }

      // Validate password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Hash password
      const passwordHash = await hashPassword(newPassword);

      // Update user to verified and set password
      const [updatedUser] = await db
        .update(users)
        .set({
          passwordHash: passwordHash,
          emailVerified: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error("Failed to update user");
      }

      // Store password in history
      await this.storePasswordInHistory(userId, passwordHash);

      return {
        success: true,
        message: "Password set successfully and account verified",
        user: updatedUser,
      };
    } catch (error) {
      console.error("Error setting initial password:", error);
      throw error;
    }
  }

  // Generate verification token for account verification
  generateAccountVerificationToken(userId) {
    return jwt.sign(
      {
        userId,
        type: "account_verification",
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      process.env.JWT_SECRET
    );
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

    // Check if email is allowed for admin registration
    if (!this.isEmailAllowedToRegister(normalizedEmail)) {
      throw new Error("Email is not authorized for admin registration");
    }

    // Seed departments if they don't exist
    await this.seedDepartments();

    // All allowed admin emails are assigned to super_admin department
    const departmentId = await this.getDepartmentIdByName("super_admin");
    if (!departmentId) {
      throw new Error("Super admin department not found in database");
    }

    // Validate password
    const passwordValidation = validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`
      );
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
      lastLoggedInAt: new Date().toISOString(),
    });

    const transaction = await db.transaction(async (tx) => {
      try {
        // Insert user
        const [insertedUser] = await tx
          .insert(users)
          .values(newUser)
          .returning();

        // Create admin record
        const adminData = createAdminData({
          userId: insertedUser.id,
          departmentId: departmentId,
          permissions: userData.permissions || [],
        });

        const [insertedAdmin] = await tx
          .insert(admins)
          .values(adminData)
          .returning();

        return { user: insertedUser, admin: insertedAdmin };
      } catch (error) {
        throw error;
      }
    });

    return transaction.user;
  }

  // Register admin without password (for team members)
  async registerAdminWithoutPassword(userData) {
    // Validate input (without password)
    const validationErrors = this.validateUserInputWithoutPassword(userData);
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

    // Check if email is allowed for admin registration
    if (!this.isEmailAllowedToRegister(normalizedEmail)) {
      throw new Error("Email is not authorized for admin registration");
    }

    // Seed departments if they don't exist
    await this.seedDepartments();

    // All allowed admin emails are assigned to super_admin department
    const departmentId = await this.getDepartmentIdByName("super_admin");
    if (!departmentId) {
      throw new Error("Super admin department not found in database");
    }

    const newUser = createUser({
      ...userData,
      email: normalizedEmail,
      passwordHash: null, // No password initially
      role: "admin",
      isActive: true,
      emailVerified: false, // Will be verified when they set password
      lastLoggedInAt: new Date().toISOString(),
    });

    const transaction = await db.transaction(async (tx) => {
      try {
        // Insert user
        const [insertedUser] = await tx
          .insert(users)
          .values(newUser)
          .returning();

        // Create admin record
        const adminData = createAdminData({
          userId: insertedUser.id,
          departmentId: departmentId,
          permissions: userData.permissions || [],
        });

        const [insertedAdmin] = await tx
          .insert(admins)
          .values(adminData)
          .returning();

        return { user: insertedUser, admin: insertedAdmin };
      } catch (error) {
        throw error;
      }
    });

    return transaction.user;
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

    // Validate password
    const passwordValidation = validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`
      );
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
      lastLoggedInAt: new Date().toISOString(),
    });
    const transaction = await db.transaction(async (tx) => {
      try {
        const [insertedUser] = await tx
          .insert(users)
          .values(newUser)
          .returning();
        const doctorData = createDoctorData({
          id: insertedUser.id,
          practiceId: userData.practiceId || null, // Allow null practice ID,
          specialty: userData.specialization || "General Practice",
          bio: userData.bio || null,
          experience: userData.experience || null,
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

  // Register doctor without password (for admin-created doctors)
  async registerDoctorWithoutPassword(userData) {
    // Validate input (without password)
    const validationErrors = this.validateUserInputWithoutPassword(userData);
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

    const newUser = createUser({
      ...userData,
      email: normalizedEmail,
      passwordHash: null, // No password initially
      role: "doctor",
      isActive: true,
      emailVerified: false, // Will be verified when they set password
      lastLoggedInAt: new Date().toISOString(),
    });

    const transaction = await db.transaction(async (tx) => {
      try {
        const [insertedUser] = await tx
          .insert(users)
          .values(newUser)
          .returning();
        const doctorData = createDoctorData({
          id: insertedUser.id,
          practiceId: userData.practiceId || null, // Allow null practice ID,
          specialty: userData.specialization || "General Practice",
          bio: userData.bio || null,
          experience: userData.experience || null,
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

    // Get user with department information
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        lastLoggedInAt: users.lastLoggedInAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        passwordHash: users.passwordHash,
        phone: users.phone,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(admins, eq(users.id, admins.id))
      .leftJoin(departments, eq(admins.departmentId, departments.id))
      .where(eq(users.email, normalizedEmail));

    if (!user) throw new Error("Invalid email or password");
    if (!user.emailVerified)
      throw new Error(
        "Email not verified. Please check your email and click the verification link before logging in."
      );
    if (!user.isActive) {
      throw new Error("Account is deactivated. Please contact your administrator.");
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new Error("Invalid email or password");

    // Ensure admin users have admin record with department
    if (user.role === "admin") {
      await this.ensureAdminRecord(user.id);
    }

    // Process user data to include department
    const processedUser = {
      ...user,
      department: user.departmentName || "N/A",
    };

    // Remove sensitive data from user object
    const { passwordHash, departmentName, ...userWithoutSensitive } =
      processedUser;

    // Generate both access and refresh tokens
    const {
      generateAccessToken,
      generateRefreshToken,
    } = require("../utils/jwt");
    const accessToken = generateAccessToken(userWithoutSensitive);
    const refreshToken = generateRefreshToken(userWithoutSensitive);

    return {
      token: accessToken,
      refreshToken: refreshToken,
      user: userWithoutSensitive,
    };
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

      // Get user with department information
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          lastLoggedInAt: users.lastLoggedInAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          passwordHash: users.passwordHash,
          departmentName: departments.name,
        })
        .from(users)
        .leftJoin(admins, eq(users.id, admins.id))
        .leftJoin(departments, eq(admins.departmentId, departments.id))
        .where(eq(users.id, id));

      if (!user) {
        throw new Error("User not found");
      }

      // Process user data to include department
      const processedUser = {
        ...user,
        department: user.departmentName || "N/A",
      };

      // Only strip sensitive data if includeSensitive is false
      if (!includeSensitive) {
        const { passwordHash, departmentName, ...userWithoutSensitive } =
          processedUser;
        return userWithoutSensitive;
      }

      return processedUser;
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
      filteredData.updatedAt = new Date().toISOString();

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
          updatedAt: new Date().toISOString(),
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

      // Build query with joins for admin users
      let query = db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          lastLoggedInAt: users.lastLoggedInAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          departmentName: departments.name,
        })
        .from(users)
        .leftJoin(admins, eq(users.id, admins.id))
        .leftJoin(departments, eq(admins.departmentId, departments.id));

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

      // Process results to include department information
      const processedResults = results.map((user) => {
        const { passwordHash, ...userWithoutSensitive } = user;
        return {
          ...userWithoutSensitive,
          department: user.departmentName || "N/A",
        };
      });

      return {
        users: processedResults,
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
          updatedAt: new Date().toISOString(),
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

  // Ensure admin user has admin record with department
  async ensureAdminRecord(userId) {
    try {
      // Check if admin record exists
      const [existingAdmin] = await db
        .select()
        .from(admins)
        .where(eq(admins.id, userId));

      if (existingAdmin) {
        return existingAdmin;
      }

      // Get user to check if they're an admin
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user || user.role !== "admin") {
        throw new Error("User is not an admin");
      }

      // Seed departments if they don't exist
      await this.seedDepartments();

      // Get super_admin department ID
      const departmentId = await this.getDepartmentIdByName("super_admin");
      if (!departmentId) {
        throw new Error("Super admin department not found");
      }

      // Create admin record
      const [newAdmin] = await db
        .insert(admins)
        .values({
          id: userId,
          departmentId: departmentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      console.log(
        `Created admin record for user ${userId} with department super_admin`
      );
      return newAdmin;
    } catch (error) {
      console.error("Error ensuring admin record:", error);
      throw error;
    }
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
        lastLoggedInAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      [localUser] = await db.select().from(users).where(users.id.eq(user.id));
    } else {
      await db
        .update(users)
        .set({
          lastLoggedInAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
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
module.exports.generateVerificationToken = generateVerificationToken;
