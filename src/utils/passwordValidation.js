const bcrypt = require("bcrypt");

// Password validation regex
// Requirements:
// - 8-12 characters
// - At least 1 uppercase letter
// - At least 1 lowercase letter  
// - At least 1 number
// - At least 1 special character (!@#$%&*)
// - No spaces
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%&*])[^\s]{8,12}$/;

// Password validation function
function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== "string") {
    errors.push("Password is required");
    return { isValid: false, errors };
  }

  // Check length (8-12 characters)
  if (password.length < 8 || password.length > 12) {
    errors.push("Password must be between 8 and 12 characters");
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Check for number
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check for special character
  if (!/[!@#$%&*]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%&*)");
  }

  // Check for spaces
  if (/\s/.test(password)) {
    errors.push("Password cannot contain spaces");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Check if password matches regex pattern
function matchesPasswordPattern(password) {
  return PASSWORD_REGEX.test(password);
}

// Validate password against historical passwords
async function validatePasswordHistory(newPassword, historicalPasswords, maxHistory = 5) {
  if (!historicalPasswords || historicalPasswords.length === 0) {
    return { isValid: true, error: null };
  }

  // Check against the last N passwords (default 5)
  const recentPasswords = historicalPasswords.slice(-maxHistory);
  
  for (const historicalPassword of recentPasswords) {
    const isMatch = await bcrypt.compare(newPassword, historicalPassword.passwordHash);
    if (isMatch) {
      return {
        isValid: false,
        error: `Password cannot be the same as any of your last ${maxHistory} passwords`
      };
    }
  }

  return { isValid: true, error: null };
}

// Generate password requirements message
function getPasswordRequirements() {
  return {
    title: "Password Requirements",
    requirements: [
      "8-12 characters long",
      "At least 1 uppercase letter (A-Z)",
      "At least 1 lowercase letter (a-z)", 
      "At least 1 number (0-9)",
      "At least 1 special character (!@#$%&*)",
      "No spaces allowed",
      "Cannot reuse your last 5 passwords"
    ]
  };
}

// Comprehensive password validation (includes history check)
async function validatePasswordComprehensive(password, historicalPasswords = [], maxHistory = 5) {
  // First validate the password format
  const formatValidation = validatePassword(password);
  if (!formatValidation.isValid) {
    return {
      isValid: false,
      errors: formatValidation.errors,
      error: formatValidation.errors.join(", ")
    };
  }

  // Then check against historical passwords
  const historyValidation = await validatePasswordHistory(password, historicalPasswords, maxHistory);
  if (!historyValidation.isValid) {
    return {
      isValid: false,
      errors: [historyValidation.error],
      error: historyValidation.error
    };
  }

  return {
    isValid: true,
    errors: [],
    error: null
  };
}

module.exports = {
  PASSWORD_REGEX,
  validatePassword,
  matchesPasswordPattern,
  validatePasswordHistory,
  validatePasswordComprehensive,
  getPasswordRequirements
}; 