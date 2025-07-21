const { pgTable, text, timestamp, boolean } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");
const { users } = require("./user");
const { practices } = require("./practice");

// Doctor table schema - updated to new requirements
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
  profilePicUrl: text("profile_pic_url"), // Optional
  isActive: boolean("is_active").notNull().default(true),
});

module.exports = {
  doctors,
};
