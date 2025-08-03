const {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  unique,
} = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Create role enum
const userRole = pgEnum("user_role", ["doctor", "admin"]);

// User table schema
<<<<<<< HEAD
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
=======
const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid(25)),
    email: text().notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    role: userRole().notNull(),
    phone: text(),
    isActive: boolean("is_active").default(true).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    passwordHash: text("password_hash"), // Allow null for users who haven't set password yet
    lastLoggedInAt: timestamp("last_logged_in_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("users_email_unique").on(table.email)]
);
>>>>>>> login

module.exports = {
  users,
  userRole,
};
