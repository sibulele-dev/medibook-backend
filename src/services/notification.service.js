// src/services/notification.service.js
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const logger = require("../utils/logger");
const config = require("../config/email");

/**
 * Notification Service - Handles all email and SMS notifications
 */
class NotificationService {
  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
    });

    // Initialize SMS provider (example using Twilio)
    if (config.SMS_ENABLED) {
      this.twilioClient = require("twilio")(
        config.TWILIO_ACCOUNT_SID,
        config.TWILIO_AUTH_TOKEN
      );
    }
  }

  /**
   * Send email notification
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - Email HTML content
   * @param {string} options.text - Email text content (fallback)
   * @param {string} options.practiceId - Practice ID for practice-specific templates
   * @returns {Promise<boolean>} - Success status
   */
  async sendEmail({ to, subject, html, text, practiceId }) {
    try {
      // Get practice-specific email template if available
      if (practiceId) {
        const practice = await prisma.practice.findUnique({
          where: { id: practiceId },
          select: { emailTemplate: true, name: true, logo: true },
        });

        if (practice && practice.emailTemplate) {
          // Apply practice branding to email
          html = this.applyEmailTemplate(html, practice);
        }
      }

      const result = await this.transporter.sendMail({
        from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM_ADDRESS}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      // Log notification
      await this.logNotification({
        type: "EMAIL",
        recipient: to,
        subject,
        status: "SENT",
        messageId: result.messageId,
      });

      logger.info(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${to}: ${error.message}`);

      // Log failed notification
      await this.logNotification({
        type: "EMAIL",
        recipient: to,
        subject,
        status: "FAILED",
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Send SMS notification
   * @param {Object} options - SMS options
   * @param {string} options.to - Recipient phone number
   * @param {string} options.message - SMS message
   * @returns {Promise<boolean>} - Success status
   */
  async sendSMS({ to, message }) {
    if (!config.SMS_ENABLED) {
      logger.warn("SMS notifications are disabled");
      return false;
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to,
      });

      // Log notification
      await this.logNotification({
        type: "SMS",
        recipient: to,
        subject: message.substring(0, 50), // First 50 chars as subject
        status: "SENT",
        messageId: result.sid,
      });

      logger.info(`SMS sent to ${to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send SMS to ${to}: ${error.message}`);

      // Log failed notification
      await this.logNotification({
        type: "SMS",
        recipient: to,
        subject: message.substring(0, 50),
        status: "FAILED",
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Send appointment confirmation notification
   * @param {Object} appointment - Appointment details with patient and doctor information
   * @returns {Promise<boolean>} - Success status
   */
  async sendAppointmentConfirmation(appointment) {
    const { patient, doctor, practice, startTime, endTime, service } =
      appointment;

    const subject = `Appointment Confirmation - ${practice.name}`;
    const html = `
      <h2>Your Appointment is Confirmed</h2>
      <p>Dear ${patient.firstName},</p>
      <p>Your appointment has been confirmed with the following details:</p>
      <ul>
        <li><strong>Date:</strong> ${new Date(
          startTime
        ).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${new Date(
          startTime
        ).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}</li>
        <li><strong>Doctor:</strong> ${doctor.title} ${doctor.firstName} ${
      doctor.lastName
    }</li>
        <li><strong>Service:</strong> ${service.name}</li>
        <li><strong>Location:</strong> ${practice.address}</li>
      </ul>
      <p>Please arrive 15 minutes before your appointment time.</p>
      <p>If you need to reschedule or cancel, please contact us at ${
        practice.phone
      } or reply to this email.</p>
      <p>Thank you for choosing ${practice.name}.</p>
    `;

    // Send email to patient
    const emailSent = await this.sendEmail({
      to: patient.email,
      subject,
      html,
      practiceId: practice.id,
    });

    // Send SMS if enabled and patient has phone number
    let smsSent = false;
    if (config.SMS_ENABLED && patient.phone) {
      const smsMessage = `Your appointment with ${doctor.title} ${
        doctor.lastName
      } at ${practice.name} is confirmed for ${new Date(
        startTime
      ).toLocaleDateString()} at ${new Date(startTime).toLocaleTimeString()}.`;
      smsSent = await this.sendSMS({
        to: patient.phone,
        message: smsMessage,
      });
    }

    return emailSent || smsSent;
  }

  /**
   * Send appointment reminder notification
   * @param {Object} appointment - Appointment details with patient and doctor information
   * @returns {Promise<boolean>} - Success status
   */
  async sendAppointmentReminder(appointment) {
    const { patient, doctor, practice, startTime, endTime, service } =
      appointment;

    const subject = `Appointment Reminder - ${practice.name}`;
    const html = `
      <h2>Appointment Reminder</h2>
      <p>Dear ${patient.firstName},</p>
      <p>This is a friendly reminder of your upcoming appointment:</p>
      <ul>
        <li><strong>Date:</strong> ${new Date(
          startTime
        ).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${new Date(
          startTime
        ).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}</li>
        <li><strong>Doctor:</strong> ${doctor.title} ${doctor.firstName} ${
      doctor.lastName
    }</li>
        <li><strong>Service:</strong> ${service.name}</li>
        <li><strong>Location:</strong> ${practice.address}</li>
      </ul>
      <p>Please arrive 15 minutes before your appointment time.</p>
      <p>If you need to reschedule or cancel, please contact us at ${
        practice.phone
      } at least 24 hours in advance.</p>
      <p>Thank you for choosing ${practice.name}.</p>
    `;

    // Send email to patient
    const emailSent = await this.sendEmail({
      to: patient.email,
      subject,
      html,
      practiceId: practice.id,
    });

    // Send SMS if enabled and patient has phone number
    let smsSent = false;
    if (config.SMS_ENABLED && patient.phone) {
      const smsMessage = `Reminder: Your appointment with ${doctor.title} ${
        doctor.lastName
      } at ${practice.name} is tomorrow at ${new Date(
        startTime
      ).toLocaleTimeString()}.`;
      smsSent = await this.sendSMS({
        to: patient.phone,
        message: smsMessage,
      });
    }

    return emailSent || smsSent;
  }

  /**
   * Send appointment cancellation notification
   * @param {Object} appointment - Appointment details with patient and doctor information
   * @param {string} reason - Cancellation reason
   * @returns {Promise<boolean>} - Success status
   */
  async sendAppointmentCancellation(appointment, reason) {
    const { patient, doctor, practice, startTime } = appointment;

    const subject = `Appointment Cancellation - ${practice.name}`;
    const html = `
      <h2>Appointment Cancellation</h2>
      <p>Dear ${patient.firstName},</p>
      <p>Your appointment with ${doctor.title} ${doctor.firstName} ${
      doctor.lastName
    } 
      on ${new Date(startTime).toLocaleDateString()} at ${new Date(
      startTime
    ).toLocaleTimeString()} 
      has been cancelled.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>Please contact us at ${
        practice.phone
      } to reschedule your appointment.</p>
      <p>We apologize for any inconvenience this may cause.</p>
      <p>Thank you for your understanding.</p>
      <p>Regards,<br>${practice.name}</p>
    `;

    // Send email to patient
    const emailSent = await this.sendEmail({
      to: patient.email,
      subject,
      html,
      practiceId: practice.id,
    });

    // Send SMS if enabled and patient has phone number
    let smsSent = false;
    if (config.SMS_ENABLED && patient.phone) {
      const smsMessage = `Your appointment with ${doctor.title} ${
        doctor.lastName
      } at ${practice.name} on ${new Date(
        startTime
      ).toLocaleDateString()} has been cancelled. Please call ${
        practice.phone
      } to reschedule.`;
      smsSent = await this.sendSMS({
        to: patient.phone,
        message: smsMessage,
      });
    }

    return emailSent || smsSent;
  }

  /**
   * Send password reset notification
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   * @param {string} resetUrl - Password reset URL
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(user, resetToken, resetUrl) {
    const subject = "Password Reset Request";
    const html = `
      <h2>Password Reset Request</h2>
      <p>Dear ${user.firstName},</p>
      <p>We received a request to reset your password. To reset your password, please click the link below:</p>
      <p><a href="${resetUrl}">Reset Your Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p>Regards,<br>Medical Booking Team</p>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  /**
   * Send welcome email to new patient
   * @param {Object} patient - Patient object
   * @param {string} practiceId - Practice ID
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(patient, practiceId) {
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        name: true,
        phone: true,
        address: true,
        email: true,
        website: true,
      },
    });

    if (!practice) {
      logger.error(`Practice not found for welcome email: ${practiceId}`);
      return false;
    }

    const subject = `Welcome to ${practice.name}`;
    const html = `
      <h2>Welcome to ${practice.name}</h2>
      <p>Dear ${patient.firstName},</p>
      <p>Thank you for registering with ${
        practice.name
      }. We are delighted to welcome you as a patient.</p>
      <p>Your patient account has been created successfully. You can now book appointments online through our website or mobile app.</p>
      <h3>Practice Information:</h3>
      <ul>
        <li><strong>Address:</strong> ${practice.address}</li>
        <li><strong>Phone:</strong> ${practice.phone}</li>
        <li><strong>Email:</strong> ${practice.email}</li>
        ${
          practice.website
            ? `<li><strong>Website:</strong> ${practice.website}</li>`
            : ""
        }
      </ul>
      <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
      <p>We look forward to providing you with excellent care.</p>
      <p>Regards,<br>${practice.name} Team</p>
    `;

    return await this.sendEmail({
      to: patient.email,
      subject,
      html,
      practiceId,
    });
  }

  /**
   * Apply practice email template to email content
   * @param {string} content - Email content
   * @param {Object} practice - Practice object with template and branding
   * @returns {string} - Formatted email with template
   */
  applyEmailTemplate(content, practice) {
    // Simple template with practice branding
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .logo { max-height: 80px; }
          .content { padding: 20px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          ${
            practice.logo
              ? `<img src="${practice.logo}" alt="${practice.name}" class="logo">`
              : `<h1>${practice.name}</h1>`
          }
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${
      practice.name
    }. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Strip HTML tags for plain text emails
   * @param {string} html - HTML content
   * @returns {string} - Plain text content
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Log notification to database
   * @param {Object} data - Notification data
   * @returns {Promise<void>}
   */
  async logNotification(data) {
    try {
      await prisma.notification.create({
        data: {
          type: data.type,
          recipient: data.recipient,
          subject: data.subject,
          status: data.status,
          messageId: data.messageId || null,
          error: data.error || null,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(`Failed to log notification: ${error.message}`);
    }
  }

  /**
   * Schedule a notification to be sent later
   * @param {string} type - Notification type (EMAIL, SMS)
   * @param {Object} data - Notification data
   * @param {Date} scheduleTime - When to send the notification
   * @returns {Promise<boolean>} - Success status
   */
  async scheduleNotification(type, data, scheduleTime) {
    try {
      // Create scheduled notification record
      await prisma.scheduledNotification.create({
        data: {
          type,
          data: JSON.stringify(data),
          scheduleTime,
          status: "PENDING",
        },
      });

      logger.info(`Notification scheduled for ${scheduleTime}`);
      return true;
    } catch (error) {
      logger.error(`Failed to schedule notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Process scheduled notifications that are due
   * @returns {Promise<number>} - Number of processed notifications
   */
  async processScheduledNotifications() {
    try {
      // Find notifications due for sending
      const dueNotifications = await prisma.scheduledNotification.findMany({
        where: {
          scheduleTime: {
            lte: new Date(),
          },
          status: "PENDING",
        },
      });

      let sent = 0;

      for (const notification of dueNotifications) {
        try {
          const data = JSON.parse(notification.data);
          let success = false;

          // Send notification based on type
          if (notification.type === "EMAIL") {
            success = await this.sendEmail(data);
          } else if (notification.type === "SMS") {
            success = await this.sendSMS(data);
          }

          // Update notification status
          await prisma.scheduledNotification.update({
            where: { id: notification.id },
            data: {
              status: success ? "SENT" : "FAILED",
              processedAt: new Date(),
            },
          });

          if (success) sent++;
        } catch (error) {
          logger.error(
            `Failed to process scheduled notification ${notification.id}: ${error.message}`
          );

          // Mark as failed
          await prisma.scheduledNotification.update({
            where: { id: notification.id },
            data: {
              status: "FAILED",
              processedAt: new Date(),
              error: error.message,
            },
          });
        }
      }

      return sent;
    } catch (error) {
      logger.error(`Error in processScheduledNotifications: ${error.message}`);
      return 0;
    }
  }
}

module.exports = new NotificationService();
