const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwtUtils = require("../utils/jwt");
const { BadRequestError, UnauthorizedError } = require("../utils/errors");

const prisma = new PrismaClient();

/**
 * Authentication and authorization service
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.firstName - User first name
   * @param {string} userData.lastName - User last name
   * @param {string} userData.role - User role (PATIENT, DOCTOR, RECEPTIONIST, PRACTICE_ADMIN, SUPER_ADMIN)
   * @param {string} [userData.practiceId] - Practice ID (required for DOCTOR, RECEPTIONIST, PRACTICE_ADMIN)
   * @returns {Promise<Object>} Registered user (without password)
   */
  async register(userData) {
    const { email, password, firstName, lastName, role, practiceId } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestError("User with this email already exists");
    }

    // Validate role-specific requirements
    if (
      ["DOCTOR", "RECEPTIONIST", "PRACTICE_ADMIN"].includes(role) &&
      !practiceId
    ) {
      throw new BadRequestError(`Practice ID is required for ${role} role`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        ...(practiceId && { practices: { connect: { id: practiceId } } }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create specific role record if needed
    if (role === "PATIENT") {
      await prisma.patient.create({
        data: {
          userId: user.id,
        },
      });
    } else if (role === "DOCTOR") {
      await prisma.doctor.create({
        data: {
          userId: user.id,
          practiceId,
        },
      });
    }

    return user;
  }

  /**
   * Log in a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Auth data (user and tokens)
   */
  async login(email, password) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        practices: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Generate tokens
    const { accessToken, refreshToken } = jwtUtils.generateTokens(user);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken(refreshToken) {
    // Verify refresh token exists and is valid
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Generate new tokens
    const tokens = jwtUtils.generateTokens(tokenRecord.user);

    // Update refresh token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return tokens;
  }

  /**
   * Log out a user by invalidating their refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<void>}
   */
  async logout(refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async forgotPassword(email) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return;
    }

    // Generate reset token
    const resetToken = jwtUtils.generatePasswordResetToken(user.id);

    // Save reset token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send email with reset token
    // This would be handled by a notification service in production
    // For now, we'll just return the token for development purposes
    return resetToken;
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async resetPassword(token, newPassword) {
    // Verify token is valid
    const payload = jwtUtils.verifyPasswordResetToken(token);
    if (!payload) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    // Find reset record
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token,
        userId: payload.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetRecord) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { password: hashedPassword },
    });

    // Delete reset record
    await prisma.passwordReset.delete({
      where: { id: resetRecord.id },
    });
  }

  /**
   * Check if user has permission for a specific practice
   * @param {string} userId - User ID
   * @param {string} practiceId - Practice ID
   * @returns {Promise<boolean>} Whether user has permission
   */
  async hasPracticePermission(userId, practiceId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        practices: true,
      },
    });

    if (!user) return false;

    // Super admins have access to all practices
    if (user.role === "SUPER_ADMIN") return true;

    // Check if user is associated with this practice
    return user.practices.some((practice) => practice.id === practiceId);
  }
}

module.exports = new AuthService();
