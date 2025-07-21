const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Practice table schema
const practices = pgTable("practices", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid(25)),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country"),
  phone: text("phone").notNull(),
  status: text("status").default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Practice status enum
const practiceStatusEnum = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

module.exports = {
  practices,
  practiceStatusEnum,
};
