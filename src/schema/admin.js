const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");
const { users } = require("./user");

// Admin table schema - extends user with admin-specific fields
const admins = pgTable("admins", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  department: text("department"), // Example admin-specific field
  permissions: text("permissions"), // Example: comma-separated permissions or JSON
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

module.exports = { admins };
