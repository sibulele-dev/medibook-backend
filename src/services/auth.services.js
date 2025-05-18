// src/services/authService.js
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const { generateToken, generateResetToken } = require("../utils/tokens");
const sendEmail = require("../utils/email");

const prisma = new PrismaClient();

/**
 * Login a user
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} User data and token
 */
exports.login = async (email, password) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Check if password is correct
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw new Error("Invalid credentials");
  }

  // Check if 2FA is enabled
  if (user.twoFactorEnabled) {
    return {
      requiresTwoFactor: true,
      userId: user.id,
    };
  }

  // Generate JWT token
  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    token,
  };
};

/**
 * Verify 2FA token
 * @param {String} userId - User ID
 * @param {String} token - 2FA token
 * @returns {Object} User data and token
 */
exports.verifyTwoFactor = async (userId, token) => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Verify token
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: token,
  });

  if (!verified) {
    throw new Error("Invalid verification code");
  }

  // Generate JWT token
  const jwtToken = generateToken(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    token: jwtToken,
  };
};

/**
 * Setup 2FA for a user
 * @param {Object} user - User object
 * @returns {Object} 2FA setup data
 */
exports.setupTwoFactor = async (user) => {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `DoctorBookingApp:${user.email}`,
  });

  // Save secret to user
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret.base32 },
  });

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode,
  };
};

/**
 * Enable 2FA for a user
 * @param {String} userId - User ID
 * @param {String} token - 2FA token
 */
exports.enableTwoFactor = async (userId, token) => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Verify token
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: token,
  });

  if (!verified) {
    throw new Error("Invalid verification code");
  }

  // Enable 2FA for user
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });
};

/**
 * Forgot password - send reset email
 * @param {String} email - User email
 * @param {String} resetUrl - Reset URL base
 */
exports.forgotPassword = async (email, resetUrl) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("No user with that email address");
  }

  // Generate reset token
  const { resetToken, hashedToken, resetExpires } = generateResetToken();

  // Save reset token to user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: resetExpires,
    },
  });

  // Create reset URL
  const completeResetUrl = `${resetUrl}/${resetToken}`;

  // Create email message
  const message = `
    You requested a password reset. Please click on the link below to reset your password:
    ${completeResetUrl}
    If you didn't request this, please ignore this email.
  `;

  // Send email
  try {
    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      message,
      html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset.</p>
        <p>Please click on the link below to reset your password:</p>
        <a href="${completeResetUrl}" target="_blank">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  } catch (error) {
    // If email fails, remove reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    throw new Error("Failed to send email");
  }
};

/**
 * Reset password
 * @param {String} token - Reset token
 * @param {String} password - New password
 */
exports.resetPassword = async (token, password) => {
  // Hash token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user by token and check if token is still valid
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired token");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });
};

/**
 * Get current user
 * @param {String} userId - User ID
 * @returns {Object} User data
 */
exports.getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
  };
};
