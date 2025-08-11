const { pgTable, text, timestamp, pgEnum } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

const practiceStatusEnum = pgEnum(
  "practice_status",
  ["active", "inactive", "pending"],
  {
    existing: true,
  }
);

// Practice table schema
const practices = pgTable(
  "practices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid(25)),
    name: text("name").notNull(),
    address: text("address").notNull(),
    city: text("city"),
    province: text("province"),
    zip: text("zip"),
    country: text("country"),
    phone: text("phone").notNull(),
    practiceContact: text("practice_contact"),
    practiceNumber: text("practice_number").notNull(),
    status: practiceStatusEnum("status").default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  {
    existing: true,
  }
);

module.exports = {
  practices,
  practiceStatusEnum,
};
