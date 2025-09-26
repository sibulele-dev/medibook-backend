const { pgTable, text, timestamp, primaryKey } = require("drizzle-orm/pg-core");
const { users } = require("./user");
const { departments } = require("./department");

// Admin table schema
const admins = pgTable("admins", {
  id: text("id").primaryKey().notNull().references(() => users.id),
  departmentId: text("department_id").notNull().references(() => departments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Permissions table (if not already defined)
const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

const adminPermissions = pgTable(
  "admin_permissions",
  {
    adminId: text("admin_id").notNull().references(() => admins.id),
    permissionId: text("permission_id").notNull().references(() => permissions.id),
  },
  (table) => ({
    pk: primaryKey(table.adminId, table.permissionId),
  })
);
  
module.exports = { admins, permissions, adminPermissions };
