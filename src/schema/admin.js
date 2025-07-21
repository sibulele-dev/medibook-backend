const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");
const { users } = require("./user");

// Admin table schema - extends user with admin-specific fields
const admins = pgTable("admins", {
  id: text("id") // admin ID (same as users.id)
    .primaryKey()
    .notNull()
    .references(() => users.id), // FK → users table

  department: text("department"), // optional field
  permissions: text("permissions"), // can be JSON or comma-separated
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

module.exports = { admins };
