const doctorService = require("../services/doctor.service");

class DoctorController {
  async getAllDoctors(req, res) {
    try {
      const doctors = await doctorService.getAllDoctors();
      res.status(200).json({ success: true, data: doctors });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to fetch doctors",
        });
    }
  }
}

module.exports = new DoctorController();
