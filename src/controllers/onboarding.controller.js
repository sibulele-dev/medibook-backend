const doctorService = require('../services/doctor.service');
const emailService = require('../services/email.service');

class OnboardingController {
  async checkEmail(req, res) {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email query parameter is required.' });
      }
      const doctor = await doctorService.findDoctorByEmail(email);
      res.status(200).json({ success: true, exists: !!doctor });
    } catch (error) {
      console.error('Error checking email existence:', error);
      res.status(500).json({ success: false, message: 'Server error while checking email.' });
    }
  }

  async onboardDoctor(req, res) {
    try {
      const doctorData = req.body;

      // Register doctor with pending status
      const newDoctor = await doctorService.registerDoctor(doctorData);

      // Send acknowledgment email
      await emailService.sendOnboardingAcknowledgementEmail(
        newDoctor.email,
        `${newDoctor.firstName} ${newDoctor.lastName}`
      );

      res.status(201).json({
        success: true,
        message: 'Doctor registered successfully. An acknowledgment email has been sent.',
        data: newDoctor,
      });
    } catch (error) {
      console.error('Error during doctor onboarding:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to onboard doctor.',
      });
    }
  }
}

module.exports = new OnboardingController();