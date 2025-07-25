const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");
const { users } = require("./user");
const { departments } = require("./department");

// Admin table schema - extends user with admin-specific fields
const admins = pgTable("admins", {
  id: text("id") // admin ID (same as users.id)
    .primaryKey()
    .notNull()
    .references(() => users.id), // FK → users table

  departmentId: text("department_id")
    .notNull()
    .references(() => departments.id), // FK → departments table
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Permissions table (if not already defined)
const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

// Join table for many-to-many admin-permissions
const adminPermissions = pgTable("admin_permissions", {
  adminId: text("admin_id")
    .notNull()
    .references(() => admins.id),
  permissionId: text("permission_id")
    .notNull()
    .references(() => permissions.id),
}, (table) => {
  return {
    pk: table.primaryKey(["admin_id", "permission_id"]),
  };
});

module.exports = { admins, permissions, adminPermissions };
