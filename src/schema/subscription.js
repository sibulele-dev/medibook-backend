const { pgTable, text, timestamp, integer, pgEnum } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");

// Import referenced tables
const { doctors } = require("./doctor");

const subscriptionStatus = pgEnum("subscription_status", ['active', 'canceled', 'refunded', 'expired']);

const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid(25)),
  doctorId: text("doctor_id").notNull().references(() => doctors.id),
  planName: text("plan_name").notNull().default("Standard"),
  amount: integer("amount").notNull().default(600),
  status: subscriptionStatus("status"),
  startDate: timestamp("start_date"),
  nextBillingDate: timestamp("next_billing_date"),
  endDate: timestamp("end_date"),
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

module.exports = {
  subscriptions,
  subscriptionStatus,
};
