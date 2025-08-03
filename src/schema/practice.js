const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Practice table schema
const practices = pgTable("practices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid(25)),
<<<<<<< HEAD
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  province: text("province"),
  zip: text("zip"),
  country: text("country"),
  phone: text("phone").notNull(),
  practiceContact: text("practice_contact"),
  practiceNumber: text("practice_number").notNull(), // Now required
  status: text("status").default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
=======
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
>>>>>>> login
});

module.exports = {
  practices,
};
