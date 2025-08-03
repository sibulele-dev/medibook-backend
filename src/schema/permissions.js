const { pgTable, text } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Permissions table schema
const permissions = pgTable("permissions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid(25)),
  name: text().notNull(),
  description: text(),
});

module.exports = {
  permissions,
}; 