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
    .$defaultFn(() => nanoid(30)), // 21 characters for nanoid
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Simple helper function to create a new user (role will be determined in service)
const createUser = (userData) => {
  return {
    ...userData,
    id: nanoid(21),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

module.exports = {
  users,
  userRoleEnum,
  createUser,
};
