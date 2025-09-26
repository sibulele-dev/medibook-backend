
const { pgTable, text, integer, date, timestamp, pgEnum } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");
const { doctors } = require("./doctor");
const { subscriptions } = require("./subscriptions");

const paymentStatusEnum = pgEnum("payment_status", ["success","failed","refunded"]);

const subscriptionPayments = pgTable("subscription_payments", {
  id: text("id").primaryKey().notNull().$defaultFn(() => nanoid(25)),
  doctorId: text("doctor_id").notNull().references(() => doctors.id),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("ZAR"),
  paymentStatus: paymentStatusEnum("payment_status"),
  transactionId: text("transaction_id").notNull(),
  invoiceUrl: text("invoice_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


module.exports = {
  subscriptionPayments,
  paymentStatusEnum,
};
