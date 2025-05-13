/**
 * Password utility functions for hashing and verification
 */
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

/**
 * Hash a password using bcrypt
 * @param {String} password - Plain text password
 * @returns {Promise<String>} Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a plain text password with a hashed password
 * @param {String} password - Plain text password
 * @param {String} hashedPassword - Hashed password from database
 * @returns {Promise<Boolean>} True if password matches
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a random reset token for password reset
 * @returns {Object} Object containing reset token and hashed token
 */
const generateResetToken = () => {
  // Generate a random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token to store in the database
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expiry time - 10 minutes
  const resetExpires = Date.now() + 10 * 60 * 1000;

  return {
    resetToken, // Send to user
    hashedToken, // Store in database
    resetExpires, // Store in database
  };
};

/**
 * Hash a reset token for database comparison
 * @param {String} token - Plain text reset token
 * @returns {String} Hashed token
 */
const hashResetToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Generate a random string for various security purposes
 * @param {Number} length - Length of the random string
 * @returns {String} Random string
 */
const generateRandomString = (length = 20) => {
  return crypto.randomBytes(length).toString("hex");
};

module.exports = {
  hashPassword,
  comparePassword,
  generateResetToken,
  hashResetToken,
  generateRandomString,
};
