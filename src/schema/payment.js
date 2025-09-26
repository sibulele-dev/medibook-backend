const { pgTable, varchar, integer, serial, timestamp, text } = require("drizzle-orm/pg-core");
const { users } = require("./user");

const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  pfPaymentId: text('pf_payment_id'),
  amount: integer('amount').notNull(),
  status: text('status').notNull().default('pending'),
  itemName: text('item_name').notNull(),
  itemDescription: text('item_description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


module.exports = { payments };
