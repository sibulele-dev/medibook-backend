const { pgTable, text, timestamp, integer } = require("drizzle-orm/pg-core");
const { users } = require("./user");

// Login attempts table schema
const loginAttempts = pgTable("login_attempts", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  email: text("email").notNull().unique(),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

module.exports = { loginAttempts };
