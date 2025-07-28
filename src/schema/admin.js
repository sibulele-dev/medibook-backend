const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");

// Admin table schema
const admins = pgTable("admins", {
  id: text().primaryKey().notNull(),
  departmentId: text("department_id").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

module.exports = {
  admins,
};
