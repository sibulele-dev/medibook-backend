const db = require("../db");
const { appointments } = require("../schema/appointment");
const { eq, and, asc } = require("drizzle-orm");
const { nanoid } = require("nanoid");

class AppointmentService {
  async getAppointmentsByDoctorId(doctorId) {
    try {
      const appointmentsList = await db
        .select()
        .from(appointments)
        .where(eq(appointments.doctorId, doctorId))
        .orderBy(asc(appointments.date), asc(appointments.time));

      return appointmentsList;
    } catch (error) {
      console.error("Error fetching appointments by doctor:", error);
      throw new Error("Failed to fetch appointments");
    }
  }

  async getAppointmentsByDoctorIdAndDate(doctorId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const appointmentsList = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            // Assuming 'date' column in DB is a string in 'YYYY-MM-DD' format
            // For more robust date filtering, consider storing dates as actual DATE/TIMESTAMP types
            // and using Drizzle's date functions if available, or converting to string for comparison
            eq(appointments.date, date) 
          )
        )
        .orderBy(asc(appointments.time)); // Order by time for chronological display

      return appointmentsList;
    } catch (error) {
      console.error("Error fetching appointments by doctor and date:", error);
      throw new Error("Failed to fetch appointments");
    }
  }

  async createAppointment(appointmentData) {
    try {
      const newAppointment = {
        id: nanoid(25),
        ...appointmentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await db.insert(appointments).values(newAppointment).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating appointment:", error);
      throw new Error("Failed to create appointment");
    }
  }

  async updateAppointment(id, updateData) {
    try {
      const updatedAppointment = {
        ...updateData,
        updatedAt: new Date(),
      };
      const result = await db.update(appointments).set(updatedAppointment).where(eq(appointments.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error("Error updating appointment:", error);
      throw new Error("Failed to update appointment");
    }
  }

  async deleteAppointment(id) {
    try {
      const result = await db.delete(appointments).where(eq(appointments.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error("Error deleting appointment:", error);
      throw new Error("Failed to delete appointment");
    }
  }
}

module.exports = new AppointmentService();