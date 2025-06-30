const { pgTable, text } = require("drizzle-orm/pg-core");
const { practices } = require("./practice");
const { users } = require("./user");

// Join table for practices and doctors
const practiceDoctors = pgTable("practice_doctors", {
  practiceId: text("practice_id")
    .notNull()
    .references(() => practices.id),
  doctorId: text("doctor_id")
    .notNull()
    .references(() => users.id),
});

module.exports = { practiceDoctors };
