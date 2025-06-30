const db = require("../db");
const { doctors } = require("../schema/doctor");

class DoctorService {
  async getAllDoctors() {
    try {
      const allDoctors = await db.select().from(doctors);
      return allDoctors;
    } catch (error) {
      throw new Error("Failed to fetch doctors");
    }
  }
}

module.exports = new DoctorService();
