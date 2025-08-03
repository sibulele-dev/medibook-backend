const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Practice table schema
const practices = pgTable("practices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid(25)),
  name: text().notNull(),
  address: text().notNull(),
  city: text(),
  province: text(),
  zip: text(),
  country: text(),
  phone: text().notNull(),
  practiceContact: text("practice_contact"),
  practiceNumber: text("practice_number").notNull(),
  status: text().default("active"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

module.exports = {
  practices,
};
