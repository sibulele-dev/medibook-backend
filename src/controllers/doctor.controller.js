const doctorService = require("../services/doctor.service");
const userService = require("../services/user.service");
const emailService = require("../services/email.service");

class DoctorController {
  async getAllDoctors(req, res) {
    try {
      const doctors = await doctorService.getAllDoctors(req.query);
      res.status(200).json({ success: true, ...doctors });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch doctors",
      });
    }
  }

  async registerDoctor(req, res) {
    try {
      const doctorData = req.body;

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
      // User-friendly error handling
      if (error.message && error.message.startsWith("Validation failed:")) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (
        error.message &&
        error.message.toLowerCase().includes("duplicate") &&
        error.message.toLowerCase().includes("email")
      ) {
        return res.status(400).json({
          success: false,
          message: "A user with this email already exists.",
        });
      }
      res.status(400).json({
        success: false,
        message:
          "An unexpected error occurred. Please check your input and try again.",
      });
    }
  }

  async getDoctorById(req, res) {
    try {
      const doctor = await doctorService.getDoctorById(req.params.id);
      if (!doctor) {
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      }
      res.status(200).json({ success: true, data: doctor });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch doctor",
      });
    }
  }

  async updateDoctor(req, res) {
    try {
      const updatedDoctor = await doctorService.updateDoctor(
        req.params.id,
        req.body
      );

      // If admin provided a password field, update the user's password using userService
      if (req.body && req.body.password) {
        try {
          await userService.updateUserPassword(req.params.id, req.body.password);
        } catch (pwErr) {
          console.error('Failed to update user password via admin edit:', pwErr);
          // Do not fail the entire request if password update fails; return info
          return res.status(200).json({ success: true, data: updatedDoctor, message: 'Doctor updated but failed to update password' });
        }
      }

      res.status(200).json({ success: true, data: updatedDoctor });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update doctor",
      });
    }
  }

  async deleteDoctor(req, res) {
    try {
      await doctorService.deleteDoctor(req.params.id);
      res
        .status(200)
        .json({ success: true, message: "Doctor deleted successfully" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete doctor",
      });
    }
  }

  async sendPasswordResetEmail(req, res) {
    try {
      const doctorId = req.params.id;
      const doctor = await doctorService.getDoctorById(doctorId);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }

      // generate token and send password setup email
      const passwordResetToken = userService.generatePasswordResetToken(doctorId);
      try {
        await emailService.sendPasswordSetupEmail(
          doctor.email,
          doctor.firstName || (doctor.name && doctor.name.split(' ')[0]) || '',
          passwordResetToken
        );
      } catch (emailErr) {
        console.error('Failed to send password setup email:', emailErr);
        // respond with 500 but include message
        return res.status(500).json({ success: false, message: 'Failed to send password setup email' });
      }

      res.status(200).json({ success: true, message: 'Password setup email sent' });
    } catch (error) {
      console.error('sendPasswordResetEmail error:', error);
      res.status(500).json({ success: false, message: 'Failed to send password reset email' });
    }
  }
}

module.exports = new DoctorController();
