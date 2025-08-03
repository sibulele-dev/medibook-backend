const { users, userRole } = require("./user");
const { practices } = require("./practice");
const { doctors } = require("./doctor");
<<<<<<< HEAD
const { practices, practiceStatusEnum, validatePracticeData } = require("./practice");
=======
const { admins } = require("./admin");
const {
  departments,
  departmentName,
  departmentPrivilege,
} = require("./department");
const { permissions } = require("./permissions");
const { passwordHistory } = require("./passwordHistory");

// Import Drizzle types for foreign key relationships
const {
  pgTable,
  text,
  foreignKey,
  primaryKey,
  integer,
  boolean,
  timestamp,
} = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Recreate tables with foreign key relationships
const doctorsWithFK = pgTable(
  "doctors",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid(25)),
    practiceId: text("practice_id").notNull(),
    specialty: text().notNull(),
    bio: text(),
    qualifications: text(),
    hpcsa: text(),
    experience: integer(),
    languages: text(),
    telehealth: text(),
    status: text().default("pending"),
    profilePicUrl: text("profile_pic_url"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [users.id],
      name: "doctors_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.practiceId],
      foreignColumns: [practices.id],
      name: "doctors_practice_id_practices_id_fk",
    }),
  ]
);

const adminsWithFK = pgTable(
  "admins",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid(25)),
    departmentId: text("department_id").notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "admins_department_id_departments_id_fk",
    }),
    foreignKey({
      columns: [table.id],
      foreignColumns: [users.id],
      name: "admins_id_users_id_fk",
    }),
  ]
);

// Define adminPermissions after adminsWithFK is defined
const adminPermissions = pgTable(
  "admin_permissions",
  {
    adminId: text("admin_id").notNull(),
    permissionId: text("permission_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.adminId],
      foreignColumns: [adminsWithFK.id], // Reference the FK version
      name: "admin_permissions_admin_id_admins_id_fk",
    }),
    foreignKey({
      columns: [table.permissionId],
      foreignColumns: [permissions.id],
      name: "admin_permissions_permission_id_permissions_id_fk",
    }),
    primaryKey({
      columns: [table.adminId, table.permissionId],
      name: "admin_permissions_admin_id_permission_id_pk",
    }),
  ]
);
>>>>>>> login

module.exports = {
  // Enums
  departmentName,
  departmentPrivilege,
  userRole,

  // Tables
  permissions,
  users,
  practices,
<<<<<<< HEAD
  practiceStatusEnum,
  validatePracticeData,
=======
  doctors: doctorsWithFK,
  departments,
  admins: adminsWithFK,
  adminPermissions,
  passwordHistory,
>>>>>>> login
};
