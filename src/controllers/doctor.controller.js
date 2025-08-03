const doctorService = require("../services/doctor.service");
const userService = require("../services/user.service");
const emailService = require("../services/email.service");

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

  async getDoctorById(req, res) {
    try {
      const { id } = req.params;
      const doctor = await doctorService.getDoctorById(id);

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch doctor",
      });
    }
  }

  async registerDoctor(req, res) {
    try {
      const {
        email,
        firstName,
        lastName,
        specialty,
        phoneNumber,
        practiceId,
        bio,
        qualifications,
        hpcsa,
        experience,
        languages,
        telehealth,
      } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName || !specialty || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Required fields: email, firstName, lastName, specialty, phoneNumber. practiceId is optional.",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const doctorData = {
        email: normalizedEmail,
        firstName,
        lastName,
        specialty,
        phoneNumber,
        practiceId,
        bio,
        qualifications,
        hpcsa,
        experience,
        languages,
        telehealth,
      };

      // Register doctor without password
      const newDoctor = await doctorService.registerDoctor(doctorData);

      // Generate verification token for email verification
      const verificationToken = userService.generateAccountVerificationToken(
        newDoctor.id
      );

      // Send account verification email (non-blocking)
      try {
        await emailService.sendAccountVerificationEmail(
          newDoctor.email,
          `${newDoctor.firstName} ${newDoctor.lastName}`,
          verificationToken,
          "doctor"
        );
      } catch (emailError) {
        console.error("Failed to send account verification email:", emailError);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        success: true,
        message:
          "Doctor registered successfully. A verification email has been sent to their email address.",
        data: {
          user: newDoctor,
          role: newDoctor.role,
        },
      });
    } catch (error) {
<<<<<<< HEAD
      // User-friendly error handling
      if (error.message && error.message.startsWith("Validation failed:")) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error.message && error.message.toLowerCase().includes("duplicate") && error.message.toLowerCase().includes("email")) {
        return res.status(400).json({ success: false, message: "A user with this email already exists." });
      }
      res.status(400).json({ success: false, message: "An unexpected error occurred. Please check your input and try again." });
    }
  }

  async getDoctorById(req, res) {
    try {
      const doctor = await doctorService.getDoctorById(req.params.id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor not found" });
      }
      res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch doctor",
=======
      console.error("Doctor registration error:", error);
      const isValidationError =
        error.message && error.message.startsWith("Missing required fields:");
      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: isValidationError
          ? error.message
          : "Could not register doctor. Please try again later.",
>>>>>>> login
      });
    }
  }

  async updateDoctor(req, res) {
    try {
<<<<<<< HEAD
      const updatedDoctor = await doctorService.updateDoctor(req.params.id, req.body);
      res.status(200).json({ success: true, data: updatedDoctor });
    } catch (error) {
=======
      const { id } = req.params;
      const updateData = req.body;

      // Validate required fields for update
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Doctor ID is required",
        });
      }

      const updatedDoctor = await doctorService.updateDoctor(id, updateData);

      res.status(200).json({
        success: true,
        message: "Doctor updated successfully",
        data: updatedDoctor,
      });
    } catch (error) {
      console.error("Doctor update error:", error);
>>>>>>> login
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update doctor",
      });
    }
  }

  async deleteDoctor(req, res) {
    try {
<<<<<<< HEAD
      await doctorService.deleteDoctor(req.params.id);
      res.status(200).json({ success: true, message: "Doctor deleted successfully" });
    } catch (error) {
=======
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Doctor ID is required",
        });
      }

      await doctorService.deleteDoctor(id);

      res.status(200).json({
        success: true,
        message: "Doctor deleted successfully",
      });
    } catch (error) {
      console.error("Doctor deletion error:", error);
>>>>>>> login
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete doctor",
      });
    }
  }
}

module.exports = new DoctorController();
