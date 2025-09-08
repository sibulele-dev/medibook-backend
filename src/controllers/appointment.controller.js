const db = require('../db');
const { appointments } = require('../schema');
const { eq } = require('drizzle-orm');

class AppointmentController {
  async create(req, res) {
    try {
      const { patientName, patientEmail, patientPhone, doctorId, practiceId, date, time, note } = req.body;

      const [created] = await db
        .insert(appointments)
        .values({ patientName, patientEmail, patientPhone, doctorId, practiceId, date, time, note })
        .returning();

      return res.status(201).json({ success: true, appointment: created });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const list = await db.select().from(appointments);
      return res.json({ success: true, appointments: list, total: list.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getByDoctor(req, res) {
    try {
      const { doctorId } = req.params;
      const list = await db.select().from(appointments).where(eq(appointments.doctorId, doctorId));
      return res.json({ success: true, appointments: list, total: list.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AppointmentController();


