const {
  users,
  userRoleEnum,
  ALLOWED_ADMIN_EMAILS,
  determineUserRole,
  createUser,
  isAdminEmail,
} = require("./user");

const {
  practices,
  practiceStatusEnum,
  validatePracticeData,
  createPracticeData,
  updatePracticeData,
} = require("./practice");

const {
  doctors,
  SPECIALIZATIONS,
  validateDoctorData,
  createDoctorData,
  updateDoctorData,
} = require("./doctor");

const { loginAttempts } = require("./loginAttempt");
const { admins } = require("./admin");

module.exports = {
  users,
  userRoleEnum,
  ALLOWED_ADMIN_EMAILS,
  determineUserRole,
  createUser,
  isAdminEmail,
  practices,
  practiceStatusEnum,
  validatePracticeData,
  createPracticeData,
  updatePracticeData,
  doctors,
  SPECIALIZATIONS,
  validateDoctorData,
  createDoctorData,
  updateDoctorData,
  loginAttempts,
  admins,
};
