const { users, userRole } = require("./user");
const {
  practices,
  practiceStatusEnum,
  validatePracticeData,
} = require("./practice");
const { doctors } = require("./doctor");
const { appointments } = require("./appointment");
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
  appointments,
  admins,
  permissions,
  adminPermissions,

  // Validation functions
  validatePracticeData,
};
