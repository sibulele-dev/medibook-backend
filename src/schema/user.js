const {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
} = require("drizzle-orm/pg-core");

const userRole = pgEnum("user_role", ["doctor", "admin"], { existing: true });

const users = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").notNull().unique("users_email_unique"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRole("role").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  passwordHash: text("password_hash"),
  lastLoggedInAt: timestamp("last_logged_in_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


module.exports = {
  users,
  userRole,
};
