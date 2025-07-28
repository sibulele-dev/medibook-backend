const { pgTable, text, timestamp, uuid } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

const passwordHistory = pgTable("password_history", {
  id: text("id").primaryKey().$defaultFn(() => nanoid(25)),
  userId: text("user_id").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

module.exports = { passwordHistory }; 