const { sendEmail, emailTemplates } = require("../config/email");

class EmailService {
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

      console.log(`Welcome email sent to ${userEmail}`);
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

      console.log(`Password reset email sent to ${userEmail}`);
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

      console.log(`Email verification sent to ${userEmail}`);
      return result;
    } catch (error) {
      console.error("Error sending email verification:", error);
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

      console.log(`Security alert sent to ${userEmail}`);
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

      console.log(`Custom email sent to ${userEmail}`);
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

      console.log(`Bulk email sent to ${recipients.length} recipients`);
      return results;
    } catch (error) {
      console.error("Error sending bulk email:", error);
      throw error;
    }
  }
}

module.exports = new EmailService();
