/**
 * Validation utility functions
 */

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} True if email is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 * @param {String} password - Password to validate
 * @returns {Object} Validation result and message
 */
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }

  return { isValid: true, message: "Password is valid" };
};

/**
 * Validate phone number format
 * @param {String} phone - Phone number to validate
 * @returns {Boolean} True if phone number is valid
 */
const isValidPhone = (phone) => {
  // Basic phone validation - allows various formats
  // Customize based on your regional requirements
  const phoneRegex =
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,3}[-\s.]?[0-9]{4,10}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate date of birth
 * @param {String} dob - Date of birth string (YYYY-MM-DD)
 * @returns {Object} Validation result and message
 */
const validateDateOfBirth = (dob) => {
  const dobDate = new Date(dob);
  const today = new Date();

  if (isNaN(dobDate.getTime())) {
    return {
      isValid: false,
      message: "Invalid date format. Please use YYYY-MM-DD format.",
    };
  }

  if (dobDate > today) {
    return { isValid: false, message: "Date of birth cannot be in the future" };
  }

  // Check if person is older than 120 years (likely an error)
  const maxAge = new Date();
  maxAge.setFullYear(today.getFullYear() - 120);
  if (dobDate < maxAge) {
    return {
      isValid: false,
      message: "Date of birth seems too far in the past",
    };
  }

  return { isValid: true, message: "Valid date of birth" };
};

/**
 * Validate that a string contains only alphanumeric characters and basic punctuation
 * @param {String} text - Text to validate
 * @returns {Boolean} True if text is valid
 */
const isValidText = (text) => {
  // Allow letters, numbers, spaces, and basic punctuation
  const textRegex = /^[a-zA-Z0-9\s.,!?'"\-_]+$/;
  return textRegex.test(text);
};

/**
 * Sanitize input to prevent XSS attacks
 * @param {String} input - Input to sanitize
 * @returns {String} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Validate UUID format
 * @param {String} uuid - UUID to validate
 * @returns {Boolean} True if UUID is valid
 */
const isValidUUID = (uuid) => {
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(uuid);
};

/**
 * Validate that a string is a valid time in 24-hour format (HH:MM)
 * @param {String} time - Time string to validate
 * @returns {Boolean} True if time is valid
 */
const isValidTime = (time) => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

module.exports = {
  isValidEmail,
  validatePassword,
  isValidPhone,
  validateDateOfBirth,
  isValidText,
  sanitizeInput,
  isValidUUID,
  isValidTime,
};
