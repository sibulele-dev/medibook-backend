const { pgTable, varchar, integer, serial, timestamp, text } = require("drizzle-orm/pg-core");
const { users } = require("./user");

const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }),
  pfPaymentId: varchar('pf_payment_id', { length: 255 }),
  amount: integer('amount').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  itemDescription: text('item_description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

module.exports = { payments };
