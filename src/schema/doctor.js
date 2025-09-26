const {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
} = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Import referenced tables
const { users } = require("./user");
const { practices } = require("./practice");

const doctorStatusEnum = {
  ACTIVE: "active",
  PENDING: "pending",
  REJECTED: "rejected",
};  

const doctors = pgTable("doctors", {
  id: text("id").primaryKey().notNull().$defaultFn(() => nanoid(25)).references(() => users.id),
  practiceId: text("practice_id").notNull().references(() => practices.id),
  specialty: text("specialty").notNull(),
  bio: text("bio"),
  qualifications: text("qualifications"),
  hpcsa: text("hpcsa"),
  experience: integer("experience"),  
  languages: text("languages"),
  telehealth: boolean("telehealth").notNull().default(false),
  status: text("status").notNull().default("pending"),
  profilePicUrl: text("profile_pic_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

module.exports = {
  doctors,
  doctorStatusEnum,
};
