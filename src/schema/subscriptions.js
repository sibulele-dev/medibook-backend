
const { pgTable, text, integer, date, timestamp, pgEnum } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");
const { doctors } = require("./doctor");

const subscriptionStatusEnum = pgEnum("subscription_status", ["active","canceled","refunded","expired"]);

const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().notNull().$defaultFn(() => nanoid(25)),
  doctorId: text("doctor_id").notNull().references(() => doctors.id),
  planName: text("plan_name").notNull().default("Standard"),
  amount: integer("amount").notNull().default(600),
  status: subscriptionStatusEnum("status"),
  startDate: timestamp("start_date"),
  nextBillingDate: timestamp("next_billing_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


module.exports = {
  subscriptions,
  subscriptionStatusEnum,
};
