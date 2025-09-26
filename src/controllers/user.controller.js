const userService = require('../services/user.service');
const emailService = require('../services/email.service');
const { UserValidation } = require('../validation/user.validation');
const { eq, sql } = require('drizzle-orm');
const db = require('../db');
const { users, admins, departments } = require('../schema');
const redisClient = require('../utils/redis');
const { rateLimitMiddleware } = require('../middleware/rateLimit.middleware');
const { v4: uuidv4 } = require('uuid');
const { authLogger, errorLogger } = require('../utils/logger');
const { authMetrics, errorMetrics, sessionMetrics } = require('../utils/metrics');
const permissionService = require('../services/permission.service');
const adminActivityService = require('../services/admin-activity.service');

class UserController {
  // Register a new user - now with proper validation
  async register(req, res) {
    try {
      // Manual validation (alternatively, you can use middleware)
      const validationResult = UserValidation.validateUserRegistration(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      // Get validated and sanitized data
      const userData = UserValidation.getValidatedData(validationResult);

      // Determine role based on admin_email table
      const role = await userService.constructor.determineUserRoleByEmail(userData.email);
      userData.role = role;

      const newUser = await userService.registerUser(userData);

      // Send welcome email (non-blocking)
      try {
        await emailService.sendWelcomeEmail(
          newUser.email,
          `${newUser.firstName} ${newUser.lastName}`,
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: newUser,
          role: newUser.role,
          isAdmin: newUser.role === 'admin',
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Register a new admin - with validation
  async registerAdmin(req, res) {
    try {
      const validationResult = UserValidation.validateAdminRegistration(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const userData = UserValidation.getValidatedData(validationResult);
      const newAdmin = await userService.registerAdmin(userData);

      // Log admin creation activity
      await adminActivityService.logActivity(
        req.user.id,
        adminActivityService.ACTIVITY_TYPES.ADMIN_CREATED,
        'admin',
        newAdmin.id,
        {
          email: newAdmin.email,
          department: userData.department,
          createdBy: req.user.id
        },
        req
      );

      res.status(201).json({
        success: true,
        message: 'Admin registered successfully. Please check your email to verify your account.',
        data: {
          user: newAdmin,
          role: newAdmin.role,
          isAdmin: true,
        },
      });
    } catch (error) {
      console.error('Admin registration error:', error);
      
      // Log failed admin creation
      await adminActivityService.logFailedActivity(
        req.user.id,
        adminActivityService.ACTIVITY_TYPES.ADMIN_CREATED,
        'admin',
        null,
        error,
        req
      );

      return res.status(500).json({
        success: false,
        message: error.message || 'Could not register user. Please try again later.',
      });
    }
  }

  // Register a new admin team member - with validation
  async registerAdminMember(req, res) {
    try {
      const validationResult = UserValidation.validateAdminMemberRegistration(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const userData = UserValidation.getValidatedData(validationResult);
      // Force admin role for team members
      userData.role = 'admin';

      const newAdminMember = await userService.registerAdminWithoutPassword(userData);

      // Generate verification token
      const verificationToken = userService.generateAccountVerificationToken(newAdminMember.id);

      // Send account verification email (non-blocking)
      try {
        await emailService.sendAccountVerificationEmail(
          newAdminMember.email,
          `${newAdminMember.firstName} ${newAdminMember.lastName}`,
          verificationToken,
          'team member',
        );
      } catch (emailError) {
        console.error('Failed to send account verification email:', emailError);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        success: true,
        message:
          'Team member registered successfully. A verification email has been sent to their email address.',
        data: {
          user: newAdminMember,
          role: newAdminMember.role,
          isAdmin: true,
        },
      });
    } catch (error) {
      console.error('Team member registration error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Could not register team member. Please try again later.',
      });
    }
  }

  // Register doctor - with validation
  async registerDoctor(req, res) {
    try {
      const validationResult = UserValidation.validateDoctorRegistration(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const userData = UserValidation.getValidatedData(validationResult);
      const newDoctor = await userService.registerDoctorWithoutPassword(userData);

      // Generate verification token
      const verificationToken = userService.generateAccountVerificationToken(newDoctor.id);

      // Send account verification email (non-blocking)
      try {
        await emailService.sendAccountVerificationEmail(
          newDoctor.email,
          `${newDoctor.firstName} ${newDoctor.lastName}`,
          verificationToken,
          'doctor',
        );
      } catch (emailError) {
        console.error('Failed to send account verification email:', emailError);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        success: true,
        message:
          'Doctor registered successfully. A verification email has been sent to their email address.',
        data: {
          user: newDoctor,
          role: newDoctor.role,
        },
      });
    } catch (error) {
      console.error('Doctor registration error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Could not register doctor. Please try again later.',
      });
    }
  }

  // Login endpoint - with validation
  async login(req, res) {
    try {
      const validationResult = UserValidation.validateLogin(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const { email, password } = UserValidation.getValidatedData(validationResult);
      const clientIP = req.ip || req.connection.remoteAddress;

      console.log(`Login attempt from IP: ${clientIP}, Email: ${email}`);

      const { token, refreshToken, user } = await userService.loginUser(email, password);

      // Reset rate limit on successful login
      const { resetRateLimit } = require('../middleware/rateLimit.middleware');
      await resetRateLimit(req, res, () => {});

      // Track user session
      const { trackUserSession } = require('../utils/jwt');
      const userAgent = req.get('User-Agent') || '';
      const sessionId = await trackUserSession(user.id, clientIP, userAgent, {
        loginTime: new Date().toISOString(),
        role: user.role
      });

      // Log successful login
      authLogger.loginAttempt(email, clientIP, true);
      authLogger.sessionCreated(user.id, sessionId, clientIP);
            authMetrics.loginAttempt(true);
      sessionMetrics.sessionCreated();

      console.log(`Successful login for user: ${user.email}, Role: ${user.role}, IP: ${clientIP}, Session: ${sessionId}`);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure in production
        sameSite: 'Lax', // Protect against CSRF
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days (standardized)
        path: '/', // Set path to refresh endpoint
      });

      res.status(200).json({
        success: true,
        token, // Access token in JSON body
        user,
      });
    } catch (error) {
      const clientIP = req.ip || req.connection.remoteAddress;
      console.error(
        `Login error from IP: ${clientIP}, Email: ${req.body.email}, Error: ${error.message}`,
      );
      
      // Log failed login
      authLogger.loginAttempt(req.body.email, clientIP, false, error);
      authMetrics.loginAttempt(false);
      errorLogger.authentication(error, { email: req.body.email, ip: clientIP });
      errorMetrics.error('authentication');
      
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials',
      });
    }
  }

  // Update user profile - with validation
  async updateProfile(req, res) {
    try {
      const validationResult = UserValidation.validateProfileUpdate(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const userId = req.params.id || req.user?.id;
      const updateData = UserValidation.getValidatedData(validationResult);

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const updatedUser = await userService.updateUserProfile(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get all users with pagination and filtering - with validation
  async getAllUsers(req, res) {
    try {
      const validationResult = UserValidation.validateGetAllUsersQuery(req.query);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const { page, limit, search, role, isActive } =
        UserValidation.getValidatedData(validationResult);
      const filters = {};

      if (search) filters.search = search;
      if (role) filters.role = role;
      if (isActive !== undefined) filters.isActive = isActive;

      const result = await userService.getAllUsers(page, limit, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch users',
      });
    }
  }

  // Change password - with validation
  async changePassword(req, res) {
    try {
      const validationResult = UserValidation.validatePasswordChange(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const { currentPassword, newPassword } = UserValidation.getValidatedData(validationResult);
      const userId = req.user.id; // From auth middleware

      // Get user with password hash
      const user = await userService.getUserByEmail(req.user.email, true);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Verify current password
      const bcrypt = require('bcrypt');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Update password with history validation
      await userService.updateUserPassword(userId, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to change password',
      });
    }
  }

  // Set initial password endpoint - with validation
  async setInitialPassword(req, res) {
    try {
      const validationResult = UserValidation.validateInitialPassword(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const { token, password } = UserValidation.getValidatedData(validationResult);
      const result = await userService.setInitialPassword(token, password);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: { user: result.user },
      });
    } catch (error) {
      console.error('Set initial password error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to set initial password',
      });
    }
  }

  // Verify email endpoint - with validation
  async verifyEmail(req, res) {
    try {
      const validationResult = UserValidation.validateEmailVerification(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const { token } = UserValidation.getValidatedData(validationResult);

      // Decode and verify the token
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token',
        });
      }

      // Find user by email in payload
      const user = await userService.getUserByEmail(payload.email, true);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Mark email as verified
      await userService.updateUserProfile(user.id, { emailVerified: true });

      // Send welcome email after verification
      try {
        await emailService.sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      return res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
      console.error('Email verification error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Check email registration status - with validation
  async checkEmailRegistration(req, res) {
    try {
      const validationResult = UserValidation.validateCheckEmailRegistration(req.query);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const { email } = UserValidation.getValidatedData(validationResult);
      const isAllowed = userService.isEmailAllowedToRegister(email);

      res.status(200).json({
        success: true,
        data: {
          email,
          isAllowed,
          message: isAllowed
            ? 'Email is authorized for registration'
            : 'Email is not authorized for registration',
        },
      });
    } catch (error) {
      console.error('Check email registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // ... (rest of your controller methods remain the same)

  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.params.id || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
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
          message: 'User ID is required',
        });
      }

      const result = await userService.toggleUserStatus(id);

      // Log user status change activity
      await adminActivityService.logActivity(
        req.user.id,
        adminActivityService.ACTIVITY_TYPES.USER_STATUS_CHANGED,
        'user',
        id,
        {
          newStatus: result.isActive,
          previousStatus: !result.isActive,
          userEmail: result.email
        },
        req
      );

      res.status(200).json({
        success: true,
        message: 'User status updated successfully',
        user: result,
      });
    } catch (error) {
      console.error('Toggle user status error:', error);
      
      // Log failed status change
      await adminActivityService.logFailedActivity(
        req.user.id,
        adminActivityService.ACTIVITY_TYPES.USER_STATUS_CHANGED,
        'user',
        req.params.id,
        error,
        req
      );

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Delete user (admin only) - with validation
  async deleteUser(req, res) {
    try {
      const paramValidation = UserValidation.validateUserIdParam(req.params);
      const bodyValidation = UserValidation.validateDeleteUser(req.body);

      if (UserValidation.hasValidationError(paramValidation)) {
        const errorMessage = UserValidation.formatValidationErrors(paramValidation.error);
        return res.status(400).json({
          success: false,
          message: `Parameter validation failed: ${errorMessage}`,
        });
      }

      if (UserValidation.hasValidationError(bodyValidation)) {
        const errorMessage = UserValidation.formatValidationErrors(bodyValidation.error);
        return res.status(400).json({
          success: false,
          message: `Body validation failed: ${errorMessage}`,
        });
      }

      const { id } = UserValidation.getValidatedData(paramValidation);
      const { reason } = UserValidation.getValidatedData(bodyValidation);

      // Get user info before deletion for logging
      const userToDelete = await userService.getUserById(id);
      
      const result = await userService.deleteUser(id, reason, req.user?.id);

      // Log user deletion activity
      await adminActivityService.logActivity(
        req.user.id,
        adminActivityService.ACTIVITY_TYPES.USER_DELETED,
        'user',
        id,
        {
          deletedUserEmail: userToDelete?.email,
          deletedUserRole: userToDelete?.role,
          reason: reason,
          deletedBy: req.user.id
        },
        req
      );

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Delete user error:', error);
      
      // Log failed user deletion
      await adminActivityService.logFailedActivity(
        req.user.id,
        adminActivityService.ACTIVITY_TYPES.USER_DELETED,
        'user',
        req.params.id,
        error,
        req
      );

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Refresh access token - with validation
  async refreshToken(req, res) {
    try {
      const oldRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!oldRefreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not found in cookies or request body',
        });
      }

      console.log('Attempting to refresh token with:', {
        tokenLength: oldRefreshToken.length,
        cookieExists: !!req.cookies.refreshToken,
        bodyExists: !!req.body.refreshToken,
      });

      // Verify refresh token using the correct secret
      const jwt = require('jsonwebtoken');
      const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

      const { getRedisStatus } = require('../utils/redisStatus');
      const redisStatus = await getRedisStatus(redisClient);
      console.log('Redis client status:', redisStatus);

      let payload;
      try {
        payload = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
      }

      // Verify refresh token exists in Redis
      const userId = await redisClient.get(payload.jti);
      if (!userId || userId !== payload.id) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
      }

      // Invalidate the old refresh token in Redis
      await redisClient.del(payload.jti);

      // Get user from database
      const user = await userService.getUserById(payload.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      // Generate new access token with fingerprint
      const { generateAccessToken, rotateRefreshToken } = require('../utils/jwt');
      const fingerprint = req.fingerprint; // From tokenFingerprintMiddleware
      const accessToken = generateAccessToken(user, fingerprint);

      // Rotate refresh token with proper security
      const newRefreshToken = await rotateRefreshToken(payload.jti, user.id, fingerprint);

      // Set new refresh token as HTTP-only cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        path: '/',
      });

      // Log successful token refresh
      const clientIP = req.ip || req.connection.remoteAddress;
      authLogger.tokenRefresh(user.id, clientIP, true);
      authMetrics.tokenRefresh(true);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
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
      console.error('Refresh token error:', error);
      
      // Log failed token refresh
      const clientIP = req.ip || req.connection.remoteAddress;
      authLogger.tokenRefresh(null, clientIP, false, error);
      authMetrics.tokenRefresh(false);
      errorLogger.authentication(error, { ip: clientIP, endpoint: 'refresh' });
      errorMetrics.error('authentication');
      
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Resend verification email - with validation
  async resendVerificationEmail(req, res) {
    try {
      const validationResult = UserValidation.validateResendVerification(req.body);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const { email } = UserValidation.getValidatedData(validationResult);

      const user = await userService.getUserByEmail(email, true);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ success: false, message: 'Email is already verified' });
      }

      // Generate a new verification token
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const verificationToken = jwt.sign({ email: user.email }, JWT_SECRET, {
        expiresIn: '24h',
      });

      // Send verification email
      await emailService.sendEmailVerification(
        user.email,
        `${user.firstName} ${user.lastName}`,
        verificationToken,
      );

      return res.status(200).json({ success: true, message: 'Verification email sent' });
    } catch (error) {
      console.error('Resend verification email error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get team members (super admin only) - with validation
  async getTeamMembers(req, res) {
    try {
      const validationResult = UserValidation.validateGetAllUsersQuery(req.query);

      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      const { page, limit, search, isActive } = UserValidation.getValidatedData(validationResult);
      const filters = {};

      if (search) filters.search = search;
      if (isActive !== undefined) filters.isActive = isActive;

      const result = await userService.getAllUsers(page, limit, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Get team members error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch team members',
      });
    }
  }

  // Logout endpoint - with validation
  async logout(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const clientIP = req.ip || req.connection.remoteAddress;

      if (refreshToken) {
        try {
          const jwt = require('jsonwebtoken');
          const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
          const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
          
          // Invalidate the refresh token in Redis
          await redisClient.del(payload.jti);
          
          // Revoke all user sessions if this is a full logout
          const { revokeAllUserSessions } = require('../utils/jwt');
          await revokeAllUserSessions(payload.id);
          
          console.log(`User ${payload.id} logged out from IP: ${clientIP}`);
          
          // Log logout
          authLogger.logout(payload.id, clientIP);
          authMetrics.logout();
        } catch (error) {
          console.error('Error invalidating refresh token on logout:', error);
          // Continue with logout even if token invalidation fails (e.g., token already expired/invalid)
        }
      }

      // Clear the refresh token cookie
      res.cookie('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        expires: new Date(0), // Expire immediately
        path: '/',
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
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
      console.error('Get password requirements error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get password requirements',
      });
    }
  }

  // Get API status
  async getApiStatus(req, res) {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';
    let loggedInUsers = 0;
    let rateLimiterStatus = 'disabled';
    let authenticationStatus = 'disabled';
    let sessionManagementStatus = 'disabled';

    try {
      // Check DB connection
      await db.execute(sql`SELECT 1`);
      dbStatus = 'connected';
    } catch (dbError) {
      console.error('DB connection check failed:', dbError.message);
      dbStatus = 'disconnected';
    }

    try {
      // Check Redis connection and get logged in users
      await redisClient.ping();
      redisStatus = 'connected';
      loggedInUsers = -1; // DBSIZE not supported in this configuration
    } catch (redisError) {
      console.error('Redis connection check failed:', redisError.message);
      redisStatus = 'disconnected';
    }

    // Check if rate limiter is enabled
    if (rateLimitMiddleware) {
      rateLimiterStatus = 'enabled';
    }

    // Check Authentication status (assuming JWT is the primary auth method)
    if (process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET) {
      authenticationStatus = 'enabled';
    }

    // Session Management status (depends on Redis connection for refresh tokens)
    if (redisStatus === 'connected') {
      sessionManagementStatus = 'enabled';
    }

    try {
      const status = {
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: { status: dbStatus },
          redis: { status: redisStatus },
          rateLimiter: { status: rateLimiterStatus },
          authentication: { status: authenticationStatus },
          sessionManagement: { status: sessionManagementStatus },
        },
        users: {
          loggedIn: loggedInUsers,
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('API status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
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
      console.error('Get allowed admin emails error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Get all active sessions (admin only)
  async getAllSessions(req, res) {
    try {
      const sessions = await userService.getAllActiveSessions();
      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      console.error('Get all sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Revoke a user session (admin only)
  async revokeUserSession(req, res) {
    try {
      const { token } = req.body; // Assuming token is sent in the request body

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required',
        });
      }

      const result = await userService.revokeSession(token);
      res.status(200).json(result);
    } catch (error) {
      console.error('Revoke user session error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Debug endpoint to check user's department data
  async debugUserDepartment(req, res) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: admin access required',
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
      console.error('Debug user department error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Get admin dashboard data
  async getAdminDashboard(req, res) {
    try {
      const dashboardData = await adminActivityService.getAdminDashboard(req.user.id);
      
      res.status(200).json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      console.error('Get admin dashboard error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get admin activity logs
  async getAdminActivityLogs(req, res) {
    try {
      const {
        adminId = null,
        startDate = null,
        endDate = null,
        action = null,
        resource = null,
        success = null,
        limit = 100,
        offset = 0
      } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        action,
        resource,
        success: success !== null ? success === 'true' : null,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const activityLogs = await adminActivityService.getAdminActivityLogs(adminId, options);
      
      res.status(200).json({
        success: true,
        data: activityLogs,
      });
    } catch (error) {
      console.error('Get admin activity logs error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get user permissions
  async getUserPermissions(req, res) {
    try {
      const { userId } = req.params;
      const permissions = await permissionService.getUserPermissions(userId);
      const department = await permissionService.getUserDepartment(userId);
      
      res.status(200).json({
        success: true,
        data: {
          userId,
          permissions,
          department
        },
      });
    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Grant permission to admin
  async grantPermission(req, res) {
    try {
      const { adminId, permission } = req.body;
      
      if (!adminId || !permission) {
        return res.status(400).json({
          success: false,
          message: 'Admin ID and permission are required',
        });
      }

      const success = await permissionService.grantPermission(adminId, permission);
      
      if (success) {
        // Log permission grant activity
        await adminActivityService.logActivity(
          req.user.id,
          adminActivityService.ACTIVITY_TYPES.ADMIN_PERMISSION_GRANTED,
          'admin',
          adminId,
          {
            grantedPermission: permission,
            grantedBy: req.user.id
          },
          req
        );

        res.status(200).json({
          success: true,
          message: 'Permission granted successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to grant permission',
        });
      }
    } catch (error) {
      console.error('Grant permission error:', error);
      
      // Log failed permission grant
      await adminActivityService.logFailedActivity(
        req.user.id,
        adminActivityService.ACTIVITY_TYPES.ADMIN_PERMISSION_GRANTED,
        'admin',
        req.body.adminId,
        error,
        req
      );

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Revoke permission from admin
  async revokePermission(req, res) {
    try {
      const { adminId, permission } = req.body;
      
      if (!adminId || !permission) {
        return res.status(400).json({
          success: false,
          message: 'Admin ID and permission are required',
        });
      }

      const success = await permissionService.revokePermission(adminId, permission);
      
      if (success) {
        // Log permission revoke activity
        await adminActivityService.logActivity(
          req.user.id,
          adminActivityService.ACTIVITY_TYPES.ADMIN_PERMISSION_REVOKED,
          'admin',
          adminId,
          {
            revokedPermission: permission,
            revokedBy: req.user.id
          },
          req
        );

        res.status(200).json({
          success: true,
          message: 'Permission revoked successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to revoke permission',
        });
      }
    } catch (error) {
      console.error('Revoke permission error:', error);
      
      // Log failed permission revoke
      await adminActivityService.logFailedActivity(
        req.user.id,
        adminActivityService.ACTIVITY_TYPES.ADMIN_PERMISSION_REVOKED,
        'admin',
        req.body.adminId,
        error,
        req
      );

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get all departments
  async getAllDepartments(req, res) {
    try {
      const departments = await permissionService.getAllDepartments();
      
      res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (error) {
      console.error('Get all departments error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get all permissions
  async getAllPermissions(req, res) {
    try {
      const permissions = await permissionService.getAllPermissions();
      
      res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      console.error('Get all permissions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async addTeamMember(req, res) {
    try {
      const { firstName, lastName, email, role, permissions } = req.body;
      const newUser = await userService.registerUser({ firstName, lastName, email, role, password: 'Password123!' });
      await permissionService.grantPermissions(newUser.id, permissions);
      res.status(201).json({ success: true, data: newUser });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateTeamMemberPermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      await permissionService.revokeAllPermissions(id);
      await permissionService.grantPermissions(id, permissions);
      res.status(200).json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getRoles(req, res) {
    try {
      // In a real application, you might fetch these from a database table
      const roles = ['admin', 'doctor', 'receptionist'];
      res.status(200).json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new UserController();
