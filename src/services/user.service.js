const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const passwordUtils = require("../utils/password");
const jwtUtils = require("../utils/jwt");
const logger = require("../utils/logger");

/**
 * User service - handles business logic related to user management
 */
class UserService {
  /**
   * Create a new user
   * @param {Object} userData User data to create
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    try {
      // Hash password before storing
      const hashedPassword = await passwordUtils.hashPassword(
        userData.password
      );

      // Create user record
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || "USER",
          practiceId: userData.practiceId,
          phoneNumber: userData.phoneNumber,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          practiceId: true,
          createdAt: true,
          phoneNumber: true,
          isActive: true,
        },
      });

      logger.info(`Created new user: ${user.id}`);
      return user;
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId User ID
   * @returns {Promise<Object>} User object
   */
  async getUserById(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          practiceId: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          phoneNumber: true,
          isActive: true,
          practice: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      logger.error(`Error getting user by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by email
   * @param {string} email User email
   * @returns {Promise<Object>} User object
   */
  async getUserByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          practice: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return user;
    } catch (error) {
      logger.error(`Error getting user by email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user information
   * @param {string} userId User ID
   * @param {Object} updateData Data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updateData) {
    try {
      // If updating password, hash it first
      if (updateData.password) {
        updateData.password = await passwordUtils.hashPassword(
          updateData.password
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          practiceId: true,
          createdAt: true,
          updatedAt: true,
          phoneNumber: true,
          isActive: true,
        },
      });

      logger.info(`Updated user: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   * @param {string} userId User ID
   * @returns {Promise<void>}
   */
  async updateLastLogin(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLogin: new Date() },
      });

      logger.debug(`Updated last login for user: ${userId}`);
    } catch (error) {
      logger.error(`Error updating last login: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate a user
   * @param {string} userId User ID
   * @returns {Promise<Object>} Updated user
   */
  async deactivateUser(userId) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      logger.info(`Deactivated user: ${userId}`);
      return user;
    } catch (error) {
      logger.error(`Error deactivating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reactivate a user
   * @param {string} userId User ID
   * @returns {Promise<Object>} Updated user
   */
  async reactivateUser(userId) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });

      logger.info(`Reactivated user: ${userId}`);
      return user;
    } catch (error) {
      logger.error(`Error reactivating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get users by practice ID
   * @param {string} practiceId Practice ID
   * @param {Object} filters Optional filters
   * @returns {Promise<Array>} Array of users
   */
  async getUsersByPractice(practiceId, filters = {}) {
    try {
      const { role, isActive, search } = filters;

      let whereClause = { practiceId };

      if (role) {
        whereClause.role = role;
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive;
      }

      if (search) {
        whereClause.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          lastLogin: true,
          phoneNumber: true,
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return users;
    } catch (error) {
      logger.error(`Error getting users by practice: ${error.message}`);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId User ID
   * @param {string} currentPassword Current password
   * @param {string} newPassword New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const isPasswordValid = await passwordUtils.comparePassword(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash and update new password
      const hashedPassword = await passwordUtils.hashPassword(newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      logger.info(`Changed password for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error changing password: ${error.message}`);
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email User email
   * @returns {Promise<Object>} Reset token info
   */
  async requestPasswordReset(email) {
    try {
      const user = await this.getUserByEmail(email);

      if (!user) {
        throw new Error("User not found");
      }

      // Generate reset token
      const resetToken = jwtUtils.generateResetToken(user.id);

      // Save reset token and expiry to database
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        },
      });

      logger.info(`Created password reset request for user: ${user.id}`);

      return {
        user,
        resetToken,
      };
    } catch (error) {
      logger.error(`Error requesting password reset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} resetToken Reset token
   * @param {string} newPassword New password
   * @returns {Promise<boolean>} Success status
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Verify token
      const decodedToken = jwtUtils.verifyResetToken(resetToken);

      if (!decodedToken) {
        throw new Error("Invalid or expired token");
      }

      // Check if token exists in database and isn't expired
      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token: resetToken,
          expiresAt: { gt: new Date() },
          isUsed: false,
        },
      });

      if (!resetRecord) {
        throw new Error("Invalid or expired token");
      }

      // Hash new password
      const hashedPassword = await passwordUtils.hashPassword(newPassword);

      // Update user password
      await prisma.user.update({
        where: { id: decodedToken.userId },
        data: { password: hashedPassword },
      });

      // Mark token as used
      await prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      });

      logger.info(`Reset password for user: ${decodedToken.userId}`);
      return true;
    } catch (error) {
      logger.error(`Error resetting password: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new UserService();
