const { pgTable, text, pgEnum } = require("drizzle-orm/pg-core");
<<<<<<< HEAD

const departmentNameEnum = pgEnum("department_name", [
=======
const { nanoid } = require("nanoid");

// Department enums
const departmentName = pgEnum("department_name", [
>>>>>>> login
  "super_admin",
  "onboarding",
  "sales",
  "support",
  "billing_accounts",
<<<<<<< HEAD
  "compliance"
]);

const departmentPrivilegeEnum = pgEnum("department_privilege", [
=======
  "compliance",
]);
const departmentPrivilege = pgEnum("department_privilege", [
>>>>>>> login
  "full_access",
  "manage_departments",
  "manage_practices",
  "manage_doctors",
  "create_remove_users",
  "access_audit_trails",
  "add_practices",
  "add_doctors",
  "verify_doctor_details",
  "approve_numbers",
  "invite_users",
  "manage_demo_bookings",
  "view_adoption_funnel",
  "communicate_potential_users",
  "access_analytics",
  "help_technical_issues",
  "reset_doctor_access",
  "monitor_sessions",
  "manage_subscriptions",
  "view_update_billing",
  "send_invoices",
  "verify_credentials",
  "approve_hpcsa_bhf",
<<<<<<< HEAD
  "manage_document_verification"
]);

const departments = pgTable("departments", {
  id: text("id").primaryKey(),
  name: departmentNameEnum("name").notNull(),
  privileges: departmentPrivilegeEnum("privileges").array().notNull()
});

module.exports = { departments, departmentNameEnum, departmentPrivilegeEnum }; 
=======
  "manage_document_verification",
]);

// Department table schema
const departments = pgTable("departments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid(25)),
  name: departmentName().notNull(),
  privileges: departmentPrivilege().array().notNull(),
});

module.exports = {
  departments,
  departmentName,
  departmentPrivilege,
};
>>>>>>> login
