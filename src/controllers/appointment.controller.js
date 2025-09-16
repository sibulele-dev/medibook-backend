const appointmentService = require("../services/appointment.service");

class AppointmentController {
  async create(req, res) {
    try {
      const newAppointment = await appointmentService.createAppointment(req.body);
      return res.status(201).json({ success: true, appointment: newAppointment });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const list = await appointmentService.getAllAppointments(); // Assuming this function exists or will be created
      return res.json({ success: true, appointments: list, total: list.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getByDoctor(req, res) {
    try {
      const { doctorId } = req.params;
      const { date } = req.query; // Expecting date as a query parameter

      if (!date) {
        return res.status(400).json({ success: false, message: "Date is required" });
      }

      const list = await appointmentService.getAppointmentsByDoctorIdAndDate(doctorId, date);
      return res.json({ success: true, appointments: list, total: list.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updatedAppointment = await appointmentService.updateAppointment(id, req.body);
      if (!updatedAppointment) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
      }
      return res.status(200).json({ success: true, appointment: updatedAppointment });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const deletedAppointment = await appointmentService.deleteAppointment(id);
      if (!deletedAppointment) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
      }
      return res.status(200).json({ success: true, message: "Appointment deleted successfully" });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AppointmentController();