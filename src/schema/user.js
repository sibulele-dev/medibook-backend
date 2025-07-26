const {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
} = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Create role enum
const userRoleEnum = pgEnum("user_role", ["doctor", "admin"]);

// User table schema
const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid(25)),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull(),
  phone: text("phone"), // Changed from phoneNumber to phone for consistency
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  passwordHash: text("password_hash").notNull(),
  lastLoggedInAt: timestamp("last_logged_in_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

module.exports = {
  users,
  userRoleEnum,
};
