const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");
const { users } = require("./user"); // <-- add this

const passwordHistory = pgTable("password_history", {
  id: text("id").primaryKey().$defaultFn(() => nanoid(25)),
  userId: text("user_id").notNull().references(() => users.id),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

module.exports = { passwordHistory };

