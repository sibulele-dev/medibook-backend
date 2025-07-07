const doctorService = require("../services/doctor.service");

class DoctorController {
  async getAllDoctors(req, res) {
    try {
      const doctors = await doctorService.getAllDoctors();
      res.status(200).json({ success: true, data: doctors });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch doctors",
      });
    }
  }

  async registerDoctor(req, res) {
    try {
      const doctor = await doctorService.registerDoctor(req.body);
      res.status(201).json({ success: true, data: doctor });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new DoctorController();
