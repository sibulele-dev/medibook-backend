const { users, userRole } = require("./user");
const {
  practices,
  practiceStatusEnum,
  validatePracticeData,
} = require("./practice");
const { doctors } = require("./doctor");
const {
  departments,
  departmentNameEnum,
  departmentPrivilegeEnum,
} = require("./department");
const { admins, permissions, adminPermissions } = require("./admin");

module.exports = {
  // Enums
  departmentNameEnum,
  departmentPrivilegeEnum,
  userRole,
  practiceStatusEnum,

  // Tables
  departments,
  users,
  practices,
  doctors,
  admins,
  permissions,
  adminPermissions,

  // Validation functions
  validatePracticeData,
};
