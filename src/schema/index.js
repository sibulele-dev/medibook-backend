const { users, userRoleEnum } = require("./user");
const { admins } = require("./admin");
const { doctors } = require("./doctor");
const { practices, practiceStatusEnum } = require("./practice");

module.exports = {
  users,
  userRoleEnum,
  admins,
  doctors,
  practices,
  practiceStatusEnum,
};
