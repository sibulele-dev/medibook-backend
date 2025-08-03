const {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
} = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Doctor table schema
const doctors = pgTable("doctors", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid(25)),
  practiceId: text("practice_id"), // Make practice ID optional
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
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

module.exports = {
  doctors,
};
