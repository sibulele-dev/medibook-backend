const { sendEmail, emailTemplates } = require("../config/email");
const ejs = require('ejs');
const path = require('path');

class EmailService {
  // Send onboarding acknowledgment email
  async sendOnboardingAcknowledgementEmail(userEmail, doctorName) {
    try {
      const templatePath = path.join(__dirname, '../Templates/onboardingAcknowledgement.ejs');
      const htmlContent = await ejs.renderFile(templatePath, { doctorName });
      const result = await sendEmail({
        to: userEmail,
        subject: "medisync Onboarding Acknowledgment",
        html: htmlContent,
        text: `Welcome to medisync, ${doctorName}! Thank you for signing up. We have received your application and it is currently under review. We will verify your details and get back to you within 24-48 hours. In the meantime, if you have any questions, please don't hesitate to contact our support team. Best regards, The medisync Team`,
      });

      return result;
    } catch (error) {
      console.error("Error sending onboarding acknowledgment email:", error);
      throw error;
    }
  }

  // Send doctor welcome email when status changes to active
  async sendDoctorWelcomeEmail(userEmail, userName, passwordResetToken) {
    try {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const accountLink = `${appUrl}/doctor/dashboard`;

      const htmlContent = await ejs.renderFile(
        path.join(__dirname, '../Templates/welcome-doctor.ejs'),
        {
          userName: userName,
          accountLink: accountLink
        }
      );

      const result = await sendEmail({
        to: userEmail,
        subject: "Welcome to medisync - Your Account is Active!",
        html: htmlContent,
        text: `Welcome to medisync, Dr. ${userName}! Your account has been approved and is now active. You can now access your dashboard and start managing your practice. Visit ${accountLink} to get started.`,
      });

      return result;
    } catch (error) {
      console.error("Error sending doctor welcome email:", error);
      throw error;
    }
  }

  // Send password setup email
  async sendPasswordSetupEmail(userEmail, userName, passwordResetToken) {
    try {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const setupLink = `${appUrl}/auth/set-initial-password?token=${passwordResetToken}`;

      const htmlContent = await ejs.renderFile(
        path.join(__dirname, '../Templates/password-setup.ejs'),
        {
          userName: userName,
          setupLink: setupLink
        }
      );

      const result = await sendEmail({
        to: userEmail,
        subject: "Complete Your medisync Account Setup",
        html: htmlContent,
        text: `Welcome to medisync, Dr. ${userName}! To complete your account setup, please create a secure password by visiting: ${setupLink}`,
      });

      return result;
    } catch (error) {
      console.error("Error sending password setup email:", error);
      throw error;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(userEmail, userName) {
    try {
      const template = emailTemplates.welcome(userName);
      const result = await sendEmail({
        to: userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Welcome email sent successfully
      return result;
    } catch (error) {
      console.error("Error sending welcome email:", error);
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    try {
      const template = emailTemplates.passwordReset(resetToken, userName);
      const result = await sendEmail({
        to: userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Password reset email sent successfully
      return result;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  }

  // Send email verification
  async sendEmailVerification(userEmail, userName, verificationToken) {
    try {
      const template = emailTemplates.emailVerification(
        verificationToken,
        userName
      );
      const result = await sendEmail({
        to: userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Email verification sent successfully
      return result;
    } catch (error) {
      console.error("Error sending email verification:", error);
      throw error;
    }
  }

  // Send account verification email (for team members and doctors)
  async sendAccountVerificationEmail(userEmail, userName, verificationToken, role = "team member") {
    try {
      const template = emailTemplates.accountVerification(
        verificationToken,
        userName,
        role
      );
      const result = await sendEmail({
        to: userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Account verification email sent successfully
      return result;
    } catch (error) {
      console.error("Error sending account verification email:", error);
      throw error;
    }
  }

  // Send security alert for new login
  async sendSecurityAlert(userEmail, userName, deviceInfo) {
    try {
      const template = emailTemplates.sessionSecurityAlert(
        userName,
        deviceInfo
      );
      const result = await sendEmail({
        to: userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Security alert sent successfully
      return result;
    } catch (error) {
      console.error("Error sending security alert:", error);
      throw error;
    }
  }

  // Send custom email
  async sendCustomEmail(userEmail, subject, htmlContent, textContent) {
    try {
      const result = await sendEmail({
        to: userEmail,
        subject: subject,
        html: htmlContent,
        text: textContent,
      });

      // Custom email sent successfully
      return result;
    } catch (error) {
      console.error("Error sending custom email:", error);
      throw error;
    }
  }

  // Send bulk email to multiple recipients
  async sendBulkEmail(recipients, subject, htmlContent, textContent) {
    try {
      const results = [];

      for (const recipient of recipients) {
        try {
          const result = await sendEmail({
            to: recipient.email,
            subject: subject,
            html: htmlContent,
            text: textContent,
          });
          results.push({ email: recipient.email, success: true, result });
        } catch (error) {
          results.push({
            email: recipient.email,
            success: false,
            error: error.message,
          });
        }
      }

      // Bulk email sent successfully
      return results;
    } catch (error) {
      console.error("Error sending bulk email:", error);
      throw error;
    }
  }
}

module.exports = new EmailService();
