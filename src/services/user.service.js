const { eq, and, or, like, desc, asc, count, sql } = require("drizzle-orm");
const db = require("../db");
const { users, doctors, admins, departments, passwordHistory } = require("../schema");
const { UserValidation } = require("../validation/user.validation");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const emailService = require("./email.service");
const {
  validatePasswordComprehensive,
  getPasswordRequirements,
  validatePassword,
} = require("../utils/passwordValidation");

// Helper function to create a new user object
const createUser = (userData) => {
  return {
    ...userData,
    id: nanoid(25),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// Helper function to create admin data
const createAdminData = (adminData) => {
  return {
    ...adminData,
    id: adminData.userId, // Admin ID should match user ID
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
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function generateVerificationToken(email) {
  return jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: "24h" });
}

class UserService {
  constructor() {
    this.DEFAULT_PAGE_SIZE = 10;
    this.MAX_PAGE_SIZE = 100;
    this.ALLOWED_ADMIN_EMAILS = this.initializeAdminEmails();
  }

  initializeAdminEmails() {
    const envEmails = process.env.ALLOWED_ADMIN_EMAILS;
    if (envEmails) {
      return envEmails.split(",").map((email) => email.trim().toLowerCase());
    }
    throw new Error(
      "No admin emails configured. Please set ALLOWED_ADMIN_EMAILS environment variable."
    );
  }

  // Updated validation methods using Joi
  validateUserInput(userData) {
    const validationResult = UserValidation.validateUserRegistration(userData);
    
    if (UserValidation.hasValidationError(validationResult)) {
      const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
      return { isValid: false, errors: [errorMessage] };
    }
    
    return { isValid: true, data: UserValidation.getValidatedData(validationResult) };
  }

  validateUserInputWithoutPassword(userData) {
    const validationResult = UserValidation.validateAdminMemberRegistration(userData);
    
    if (UserValidation.hasValidationError(validationResult)) {
      const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
      return { isValid: false, errors: [errorMessage] };
    }
    
    return { isValid: true, data: UserValidation.getValidatedData(validationResult) };
  }

  validateDoctorInput(userData) {
    const validationResult = UserValidation.validateDoctorRegistration(userData);
    
    if (UserValidation.hasValidationError(validationResult)) {
      const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
      return { isValid: false, errors: [errorMessage] };
    }
    
    return { isValid: true, data: UserValidation.getValidatedData(validationResult) };
  }

  validateLoginInput(loginData) {
    const validationResult = UserValidation.validateLogin(loginData);
    
    if (UserValidation.hasValidationError(validationResult)) {
      const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
      return { isValid: false, errors: [errorMessage] };
    }
    
    return { isValid: true, data: UserValidation.getValidatedData(validationResult) };
  }

  validateProfileUpdateInput(updateData) {
    const validationResult = UserValidation.validateProfileUpdate(updateData);
    
    if (UserValidation.hasValidationError(validationResult)) {
      const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
      return { isValid: false, errors: [errorMessage] };
    }
    
    return { isValid: true, data: UserValidation.getValidatedData(validationResult) };
  }

  validateUserIdInput(userId) {
    const validationResult = UserValidation.validateUserIdParam({ id: userId });
    
    if (UserValidation.hasValidationError(validationResult)) {
      const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
      return { isValid: false, errors: [errorMessage] };
    }
    
    return { isValid: true, data: UserValidation.getValidatedData(validationResult) };
  }

  validateEmailInput(email) {
    const validationResult = UserValidation.validateEmail({ email });
    
    if (UserValidation.hasValidationError(validationResult)) {
      const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
      return { isValid: false, errors: [errorMessage] };
    }
    
    return { isValid: true, data: UserValidation.getValidatedData(validationResult) };
  }

  validatePaginationInput(page, limit, filters = {}) {
    const validationResult = UserValidation.validatePagination({ page, limit, filters });
    
    if (UserValidation.hasValidationError(validationResult)) {
      const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
      return { isValid: false, errors: [errorMessage] };
    }
    
    return { isValid: true, data: UserValidation.getValidatedData(validationResult) };
  }

  // Updated register methods with improved validation
  async registerAdmin(userData) {
    // Use Joi validation instead of manual validation
    const validation = this.validateUserInput(userData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const validatedData = validation.data;
    const normalizedEmail = validatedData.email;

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

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    const newUser = createUser({
      ...validatedData,
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
          permissions: validatedData.permissions || [],
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

  async registerAdminWithoutPassword(userData) {
    // Use Joi validation for admin member registration
    const validation = this.validateUserInputWithoutPassword(userData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const validatedData = validation.data;
    const normalizedEmail = validatedData.email;

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
      ...validatedData,
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
          permissions: validatedData.permissions || [],
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

  async registerDoctor(userData) {
    // Use Joi validation for doctor registration
    const validation = this.validateDoctorInput(userData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const validatedData = validation.data;
    const normalizedEmail = validatedData.email;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));
    if (existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }

    // Hash password if provided
    let passwordHash = null;
    if (validatedData.password) {
      passwordHash = await hashPassword(validatedData.password);
    }

    const newUser = createUser({
      ...validatedData,
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
          practiceId: validatedData.practiceId || null,
          specialty: validatedData.specialization || "General Practice",
          bio: validatedData.bio || null,
          experience: validatedData.experience || null,
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

  async registerDoctorWithoutPassword(userData) {
    // Use Joi validation for doctor registration (password optional)
    const validation = this.validateDoctorInput(userData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const validatedData = validation.data;
    const normalizedEmail = validatedData.email;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));
    if (existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }

    const newUser = createUser({
      ...validatedData,
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
          practiceId: validatedData.practiceId || null,
          specialty: validatedData.specialization || "General Practice",
          bio: validatedData.bio || null,
          experience: validatedData.experience || null,
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
    // Use Joi validation first
    const validation = this.validateUserInput(userData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const validatedData = validation.data;
    
    // Determine role based on allowed admin emails
    const normalizedEmail = validatedData.email;
    if (this.isEmailAllowedToRegister(normalizedEmail)) {
      return this.registerAdmin(validatedData);
    } else {
      return this.registerDoctor(validatedData);
    }
  }

  async loginUser(email, password) {
    // Validate login input using Joi
    const validation = this.validateLoginInput({ email, password });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const validatedData = validation.data;
    const normalizedEmail = validatedData.email;

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

    if (!user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    const valid = await verifyPassword(validatedData.password, user.passwordHash);
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
    const { passwordHash, departmentName, ...userWithoutSensitive } = processedUser;

    // Generate both access and refresh tokens
    const { generateAccessToken, generateRefreshToken, deleteAllRefreshTokensForUser } = require("../utils/jwt");

    // Invalidate all existing refresh tokens for this user
    await deleteAllRefreshTokensForUser(userWithoutSensitive.id);

    const accessToken = generateAccessToken(userWithoutSensitive);
    const refreshToken = await generateRefreshToken(userWithoutSensitive);

    return {
      token: accessToken,
      refreshToken: refreshToken,
      user: userWithoutSensitive,
    };
  }

  // Get user by email with improved error handling and Joi validation
  async getUserByEmail(email, includeSensitive = false) {
    try {
      // Validate email input using Joi
      const validation = this.validateEmailInput(email);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const validatedData = validation.data;
      const normalizedEmail = validatedData.email;

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

  // Get user by ID with improved error handling and Joi validation
  async getUserById(id, includeSensitive = false) {
    try {
      // Validate user ID input using Joi
      const validation = this.validateUserIdInput(id);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const validatedData = validation.data;

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
        .where(eq(users.id, validatedData.id));

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
        const { passwordHash, departmentName, ...userWithoutSensitive } = processedUser;
        return userWithoutSensitive;
      }

      return processedUser;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  async updateUserProfile(userId, updateData) {
    try {
      // Validate user ID using Joi
      const userIdValidation = this.validateUserIdInput(userId);
      if (!userIdValidation.isValid) {
        throw new Error(userIdValidation.errors.join(", "));
      }

      // Validate profile update data using Joi
      const validation = this.validateProfileUpdateInput(updateData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const validatedData = validation.data;

      if (Object.keys(validatedData).length === 0) {
        throw new Error("No valid fields to update");
      }

      // Add updated timestamp
      validatedData.updatedAt = new Date().toISOString();

      const [updatedUser] = await db
        .update(users)
        .set(validatedData)
        .where(eq(users.id, userIdValidation.data.userId))
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

  // Delete user (soft delete) with Joi validation
  async deleteUser(id, reason = null, deletedBy = null) {
    try {
      // Validate user ID using Joi
      const validation = this.validateUserIdInput(id);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const validatedData = validation.data;

      const [deletedUser] = await db
        .update(users)
        .set({
          isActive: false,
          status: "deleted",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, validatedData.userId))
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

  // Get all users with pagination and filtering using Joi validation
  async getAllUsers(page = 1, limit = 10, filters = {}) {
    try {
      // Validate pagination input using Joi
      const validation = this.validatePaginationInput(page, limit, filters);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const validatedData = validation.data;
      const validatedPage = validatedData.page;
      const validatedLimit = validatedData.limit;
      const validatedFilters = validatedData.filters;
      const offset = (validatedPage - 1) * validatedLimit;

      // Build where conditions
      const whereConditions = [];

      if (validatedFilters.role) {
        whereConditions.push(eq(users.role, validatedFilters.role));
      }

      if (validatedFilters.isActive !== undefined) {
        whereConditions.push(eq(users.isActive, validatedFilters.isActive));
      }

      if (validatedFilters.search) {
        const searchTerm = `%${validatedFilters.search}%`;
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

  // Toggle user status with Joi validation
  async toggleUserStatus(userId) {
    try {
      // Validate user ID using Joi
      const validation = this.validateUserIdInput(userId);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const validatedData = validation.data;

      // Get current user status
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, validatedData.id));

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
        .where(eq(users.id, validatedData.userId))
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

  async setInitialPassword(verificationToken, newPassword) {
    try {
      // Validate the input using Joi
      const validation = UserValidation.validateInitialPassword({
        token: verificationToken,
        password: newPassword,
        confirmPassword: newPassword // For validation purposes
      });
      
      if (UserValidation.hasValidationError(validation)) {
        const errorMessage = UserValidation.formatValidationErrors(validation.error);
        throw new Error(errorMessage);
      }

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

  // Utility methods
  isEmailAllowedToRegister(email) {
    if (!email || typeof email !== "string") {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();
    return this.ALLOWED_ADMIN_EMAILS.includes(normalizedEmail);
  }

  isSuperAdminEmail(email) {
    if (!email || typeof email !== "string") {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();
    return this.ALLOWED_ADMIN_EMAILS.includes(normalizedEmail);
  }

  // Determine user role based on email
  determineUserRole(email) {
    // Validate email input
    const validation = this.validateEmailInput(email);
    if (!validation.isValid) {
      return "doctor"; // Default role if validation fails
    }

    const validatedData = validation.data;
    const normalizedEmail = validatedData.email;
    return this.ALLOWED_ADMIN_EMAILS.includes(normalizedEmail) ? "admin" : "doctor";
  }

  // Get allowed admin emails
  getAllowedAdminEmails() {
    return [...this.ALLOWED_ADMIN_EMAILS];
  }

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

  getPasswordRequirements() {
    return getPasswordRequirements();
  }

  async getPasswordHistory(userId) {
    try {
      // Validate user ID using Joi
      const validation = this.validateUserIdInput(userId);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const validatedData = validation.data;

      const history = await db
        .select()
        .from(passwordHistory)
        .where(eq(passwordHistory.userId, validatedData.id))
        .orderBy(desc(passwordHistory.createdAt));

      return history;
    } catch (error) {
      console.error("Error getting password history:", error);
      return [];
    }
  }

  async storePasswordInHistory(userId, passwordHash) {
    try {
      // Validate user ID using Joi
      const validation = this.validateUserIdInput(userId);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const validatedData = validation.data;

      await db.insert(passwordHistory).values({
        userId: validatedData.id,
        passwordHash: passwordHash,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error storing password in history:", error);
    }
  }

  async updateUserPassword(userId, newPassword) {
    try {
      // Validate user ID using Joi
      const userIdValidation = this.validateUserIdInput(userId);
      if (!userIdValidation.isValid) {
        throw new Error(userIdValidation.errors.join(", "));
      }

      const validatedUserId = userIdValidation.data.userId;

      // Get password history
      const historicalPasswords = await this.getPasswordHistory(validatedUserId);

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
        .where(eq(users.id, validatedUserId))
        .returning();

      if (!updatedUser) {
        throw new Error("User not found");
      }

      // Store new password in history
      await this.storePasswordInHistory(validatedUserId, passwordHash);

      return { success: true, message: "Password updated successfully" };
    } catch (error) {
      console.error("Error updating user password:", error);
      throw error;
    }
  }

  // Ensure admin user has admin record with department
    async ensureAdminRecord(userId) {
    try {
      // Validate user ID using Joi
      const validation = this.validateUserIdInput(userId);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const validatedData = validation.data;

      // Check if admin record exists
      const [existingAdmin] = await db
        .select()
        .from(admins)
        .where(eq(admins.id, validatedData.id));

      if (existingAdmin) {
        return existingAdmin;
      }

      // Get user to check if they're an admin
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, validatedData.id));

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
          id: validatedData.id,
          departmentId: departmentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      console.log(
        `Created admin record for user ${validatedData.id} with department super_admin`
      );
      return newAdmin;
    } catch (error) {
      console.error("Error ensuring admin record:", error);
      throw error;
    }
  }

  async getAllActiveSessions() {
    const redisClient = require("../utils/redis");
    const jwt = require("jsonwebtoken");

    const sessionKeys = await redisClient.keys('user:*:refreshToken:*');
    const sessions = [];
    const sessionsByUser = {};

    for (const key of sessionKeys) {
      const userId = key.split(':')[1]; // Extract userId from key
      const refreshToken = key.split(':')[3]; // Extract refreshToken from key

      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await this.getUserById(userId);

        if (user) {
          const session = {
            token: refreshToken,
            userId: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
            role: user.role,
            issuedAt: new Date(decoded.iat * 1000).toISOString(),
            expiresAt: new Date(decoded.exp * 1000).toISOString(),
          };
          sessions.push(session);

          if (!sessionsByUser[user.id]) {
            sessionsByUser[user.id] = {
              user: {
                id: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`.trim(),
                role: user.role,
              },
              count: 0,
              sessions: [],
            };
          }
          sessionsByUser[user.id].count++;
          sessionsByUser[user.id].sessions.push(session);
        }
      } catch (error) {
        console.warn(`Invalid or expired refresh token found in Redis: ${key}`, error.message);
        // Optionally delete invalid token
        await redisClient.del(key);
      }
    }
    return {
      allSessions: sessions,
      sessionsByUser: Object.values(sessionsByUser),
    };
  }

  async revokeSession(token) {
    const redisClient = require("../utils/redis");
    const jwt = require("jsonwebtoken");

    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const userId = decoded.id;

      // Delete the specific token
      await redisClient.del(`user:${userId}:refreshToken:${token}`);

      return { success: true, message: "Session revoked successfully" };
    } catch (error) {
      console.error("Error revoking session:", error);
      throw new Error("Failed to revoke session: " + error.message);
    }
  }
}

module.exports = new UserService();
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
module.exports.generateJWT = generateJWT;
module.exports.generateVerificationToken = generateVerificationToken;
module.exports.createUser = createUser;
module.exports.createAdminData = createAdminData;
module.exports.createDoctorData = createDoctorData;