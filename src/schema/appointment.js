const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");
const { doctors } = require("./doctor");

const appointments = pgTable("appointments", {
  id: text("id").primaryKey().notNull().$defaultFn(() => nanoid(25)),
  patientName: text("patient_name").notNull(),
  patientEmail: text("patient_email"),
  patientPhone: text("patient_phone").notNull(),
  doctorId: text("doctor_id").notNull().references(() => doctors.id),
  practiceId: text("practice_id"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  note: text("note"),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


module.exports = {
  appointments,
};


