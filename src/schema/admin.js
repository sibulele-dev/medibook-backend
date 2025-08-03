const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Admin table schema
const admins = pgTable("admins", {
  id: text("id").primaryKey().$defaultFn(() => nanoid(25)),
  departmentId: text("department_id").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

module.exports = {
  admins,
};
