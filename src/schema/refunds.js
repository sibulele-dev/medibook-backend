
const { pgTable, text, integer, date, timestamp, pgEnum } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");
const { subscriptionPayments } = require("./subscription_payments");

const refundStatusEnum = pgEnum("refund_status", ["pending","success","failed"]);

const refunds = pgTable("refunds", {
  id: text("id").primaryKey().notNull().$defaultFn(() => nanoid(25)),
  paymentId: text("payment_id").notNull().references(() => subscriptionPayments.id),
  refundStatus: refundStatusEnum("refund_status"),
  refundReason: text("refund_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


module.exports = {
  refunds,
  refundStatusEnum,
};
