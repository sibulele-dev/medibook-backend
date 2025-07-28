const nodemailer = require("nodemailer");

// Email configuration from environment variables
const emailConfig = {
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Optional: Additional settings
  tls: {
    rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== "false",
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify connection configuration
const verifyConnection = async () => {
  try {
    await transporter.verify();
    // Email server connection verified successfully
    return true;
  } catch (error) {
    console.error("Email server connection failed:", error.message);
    return false;
  }
};

// Send email function
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    // Email sent successfully
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  // Welcome email template
  welcome: (userName) => ({
    subject: "Welcome to Medibook!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Medibook!</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for registering with Medibook. Your account has been created successfully.</p>
        <p>You can now log in to your account and start using our services.</p>
        <p>Best regards,<br>The Medibook Team</p>
      </div>
    `,
    text: `Welcome to Medibook! Hello ${userName}, Thank you for registering with Medibook. Your account has been created successfully.`,
  }),

  // Password reset email template
  passwordReset: (resetToken, userName) => ({
    subject: "Password Reset Request - Medibook",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You have requested to reset your password. Click the link below to reset your password:</p>
        <p><a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>The Medibook Team</p>
      </div>
    `,
    text: `Password Reset Request - Hello ${userName}, You have requested to reset your password. Visit ${process.env.FRONTEND_URL}/reset-password?token=${resetToken} to reset your password.`,
  }),

  // Email verification template
  emailVerification: (verificationToken, userName) => ({
    subject: "Verify Your Email - Medibook",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Verify Your Email</h2>
        <p>Hello ${userName},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
        <p>If you didn't create an account, please ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The Medibook Team</p>
      </div>
    `,
    text: `Verify Your Email - Hello ${userName}, Please verify your email address by visiting ${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`,
  }),

  // Session security alert template
  sessionSecurityAlert: (userName, deviceInfo) => ({
    subject: "Security Alert - New Login Detected - Medibook",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Security Alert</h2>
        <p>Hello ${userName},</p>
        <p>We detected a new login to your account from a new device or location.</p>
        <p><strong>Device Information:</strong></p>
        <ul>
          <li>IP Address: ${deviceInfo.ip || "Unknown"}</li>
          <li>User Agent: ${deviceInfo.userAgent || "Unknown"}</li>
          <li>Time: ${new Date().toLocaleString()}</li>
        </ul>
        <p>If this was you, you can safely ignore this email.</p>
        <p>If you don't recognize this login, please change your password immediately and contact support.</p>
        <p>Best regards,<br>The Medibook Security Team</p>
      </div>
    `,
    text: `Security Alert - Hello ${userName}, We detected a new login to your account. If this wasn't you, please change your password immediately.`,
  }),

  // Account verification template (for team members and doctors)
  accountVerification: (verificationToken, userName, role = "team member") => ({
    subject: "Welcome to Medibook - Verify Your Account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Welcome to Medibook!</h2>
        <p>Hello ${userName},</p>
        <p>Your account has been created by an administrator. To complete your account setup, 
        please verify your email address and set your password by clicking the button below:</p>
        <p><a href="${process.env.FRONTEND_URL}/auth/set-initial-password?token=${verificationToken}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Account & Set Password</a></p>
        <p>After verification, you'll be able to log in to your Medibook account.</p>
        <p>If you didn't expect this email, please contact your administrator.</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The Medibook Team</p>
      </div>
    `,
    text: `Welcome to Medibook! Hello ${userName}, Your account has been created. Please verify your account by visiting ${process.env.FRONTEND_URL}/auth/set-initial-password?token=${verificationToken}`,
  }),
};

module.exports = {
  transporter,
  sendEmail,
  verifyConnection,
  emailTemplates,
};
