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

// Doctor table schema
const doctors = pgTable("doctors", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(25))
    .references(() => users.id),
  practiceId: text("practice_id")
    .notNull()
    .references(() => practices.id),
  specialty: text("specialty").notNull(),
  bio: text("bio"), // Optional
  qualifications: text("qualifications"), // Added: Professional qualifications
  hpcsa: text("hpcsa"), // Added: HPCSA registration number
  experience: integer("experience"), // Added: Years of experience
  languages: text("languages"), // Added: Languages spoken
  telehealth: text("telehealth"), // Added: Telehealth availability (yes/no)
  status: text("status").default("pending"), // pending, active, rejected
  profilePicUrl: text("profile_pic_url"), // Optional
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const doctorStatusEnum = {
  ACTIVE: "active",
  PENDING: "pending",
  REJECTED: "rejected",
};

module.exports = {
  doctors,
  doctorStatusEnum,
};
