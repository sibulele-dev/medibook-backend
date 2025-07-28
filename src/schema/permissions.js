const { pgTable, text } = require("drizzle-orm/pg-core");

// Permissions table schema
const permissions = pgTable("permissions", {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
});

module.exports = {
  permissions,
}; 