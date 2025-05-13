/**
 * Email Service Configuration
 *
 * This file contains configuration for email services and templates
 * for sending notifications, password resets, and other communications.
 */

// Default values that will be overridden by environment variables
const defaultConfig = {
  // Email service provider options
  provider: process.env.EMAIL_PROVIDER || "smtp", // 'smtp', 'sendgrid', 'mailgun', etc.

  // SMTP configuration
  smtp: {
    host: process.env.SMTP_HOST || "smtp.example.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "user@example.com",
      pass: process.env.SMTP_PASSWORD || "password",
    },
    // TLS configuration
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
    },
  },

  // SendGrid configuration (if used)
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || "",
  },

  // Mailgun configuration (if used)
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY || "",
    domain: process.env.MAILGUN_DOMAIN || "",
  },

  // Email addresses
  fromEmail: process.env.FROM_EMAIL || "no-reply@medicalbooking.com",
  fromName: process.env.FROM_NAME || "Medical Booking System",
  adminEmail: process.env.ADMIN_EMAIL || "admin@medicalbooking.com",

  // Email settings
  sendEmailsInDevelopment: process.env.SEND_EMAILS_IN_DEV === "true",
  devEmailRecipient:
    process.env.DEV_EMAIL_RECIPIENT || "dev@medicalbooking.com",

  // Notification preferences defaults
  defaultNotificationPreferences: {
    appointmentConfirmation: true,
    appointmentReminder: true,
    appointmentCancellation: true,
    practiceUpdates: true,
    marketing: false,
  },

  // Reminder settings
  reminders: {
    appointmentReminderTime: parseInt(
      process.env.APPOINTMENT_REMINDER_HOURS || "24"
    ), // hours before appointment
    reminderCheckInterval: parseInt(
      process.env.REMINDER_CHECK_INTERVAL || "15"
    ), // minutes between reminder checks
  },

  // Rate limiting to prevent email flooding
  rateLimit: {
    maxPerHour: parseInt(process.env.EMAIL_MAX_PER_HOUR || "50"),
    maxPerDay: parseInt(process.env.EMAIL_MAX_PER_DAY || "200"),
  },

  // Template paths - adjust based on your template system
  templates: {
    welcome: "welcome",
    appointmentConfirmation: "appointment-confirmation",
    appointmentReminder: "appointment-reminder",
    appointmentCancellation: "appointment-cancellation",
    passwordReset: "password-reset",
    practiceInvitation: "practice-invitation",
  },
};

/**
 * Parse and validate all environment variables related to email service
 */
function validateEmailConfig() {
  // Email provider check
  const validProviders = ["smtp", "sendgrid", "mailgun", "none"];
  if (!validProviders.includes(defaultConfig.provider)) {
    console.warn(
      `Invalid EMAIL_PROVIDER: ${defaultConfig.provider}. Using 'smtp' as default.`
    );
    defaultConfig.provider = "smtp";
  }

  // For production, ensure email credentials are set
  if (process.env.NODE_ENV === "production") {
    if (
      defaultConfig.provider === "smtp" &&
      defaultConfig.smtp.auth.user === "user@example.com"
    ) {
      console.warn(
        "WARNING: Using default SMTP credentials in production environment!"
      );
    } else if (
      defaultConfig.provider === "sendgrid" &&
      !defaultConfig.sendgrid.apiKey
    ) {
      console.warn(
        "WARNING: SendGrid API key not set in production environment!"
      );
    } else if (
      defaultConfig.provider === "mailgun" &&
      !defaultConfig.mailgun.apiKey
    ) {
      console.warn(
        "WARNING: Mailgun API key not set in production environment!"
      );
    }
  }

  return {
    ...defaultConfig,
    // Add any additional validation or parsing logic
  };
}

// Email templates for different types of notifications
const emailTemplates = {
  welcome: {
    subject: "Welcome to {{practiceName}}!",
    template: "welcome",
  },
  appointmentConfirmation: {
    subject: "Your appointment with {{doctorName}} has been confirmed",
    template: "appointment-confirmation",
  },
  appointmentReminder: {
    subject: "Reminder: Your appointment with {{doctorName}} is tomorrow",
    template: "appointment-reminder",
  },
  appointmentCancellation: {
    subject: "Your appointment with {{doctorName}} has been cancelled",
    template: "appointment-cancellation",
  },
  passwordReset: {
    subject: "Password Reset Request",
    template: "password-reset",
  },
};

module.exports = {
  ...validateEmailConfig(),
  emailTemplates,
};
