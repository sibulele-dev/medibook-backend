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

  async registerDoctor(req, res) {
    try {
      const {
        email,
        firstName,
        lastName,
        specialization,
        phoneNumber,
        practiceId,
        licenseNumber,
        experience,
        bio,
      } = req.body;

      // Validate required fields
      if (
        !email ||
        !firstName ||
        !lastName ||
        !specialization ||
        !phoneNumber ||
        !practiceId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All fields are required: email, firstName, lastName, specialization, phoneNumber, practiceId",
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
        specialization,
        phoneNumber,
        practiceId,
        licenseNumber,
        experience,
        bio,
      };

      // Register doctor without password
      const newDoctor = await userService.registerDoctorWithoutPassword(
        doctorData
      );

      // Generate verification token
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
      console.error("Doctor registration error:", error);
      const isValidationError =
        error.message && error.message.startsWith("Validation failed:");
      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: isValidationError
          ? error.message
          : "Could not register doctor. Please try again later.",
      });
    }
  }
}

module.exports = new DoctorController();
