/**
 * Application Configuration
 *
 * This file contains general application settings and configuration
 * that doesn't fit into other specific config categories.
 */

// Default values that will be overridden by environment variables
const defaultConfig = {
  // Application basics
  name: process.env.APP_NAME || "Medical Booking API",
  version: process.env.npm_package_version || "1.0.0",
  environment: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
  isTest: process.env.NODE_ENV === "test",

  // Server configuration
  server: {
    port: parseInt(process.env.PORT || "5000"),
    host: process.env.HOST || "0.0.0.0",
    baseUrl: process.env.API_BASE_URL || "http://localhost:5000",
    apiPrefix: process.env.API_PREFIX || "/api",
  },

  // Frontend URLs for CORS and redirects
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:3000",
    adminUrl: process.env.ADMIN_FRONTEND_URL || "http://localhost:3000/admin",
  },

  // File upload limits and paths
  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || "5") * 1024 * 1024, // 5MB default
    allowedFileTypes: (
      process.env.ALLOWED_FILE_TYPES ||
      "image/jpeg,image/png,image/gif,application/pdf"
    ).split(","),
    storageType: process.env.FILE_STORAGE_TYPE || "local", // 'local', 's3', etc.
    localStoragePath: process.env.UPLOAD_PATH || "uploads/",
    s3Bucket: process.env.S3_BUCKET || "medical-booking-uploads",
    s3Region: process.env.S3_REGION || "us-east-1",
  },

  // Logging configuration
  logging: {
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    format: process.env.NODE_ENV === "production" ? "json" : "dev",
    logToFile: process.env.LOG_TO_FILE === "true",
    logFilePath: process.env.LOG_FILE_PATH || "logs/",
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== "false",
  },

  // Booking rules
  booking: {
    minAdvanceHours: parseInt(process.env.MIN_BOOKING_ADVANCE_HOURS || "1"),
    maxAdvanceDays: parseInt(process.env.MAX_BOOKING_ADVANCE_DAYS || "60"),
    allowSameDayBooking: process.env.ALLOW_SAME_DAY_BOOKING !== "false",
    minCancellationHours: parseInt(process.env.MIN_CANCELLATION_HOURS || "24"),
    defaultAppointmentDuration: parseInt(
      process.env.DEFAULT_APPOINTMENT_DURATION || "30"
    ), // minutes
  },

  // Default practice hours (used for new practices)
  defaultPracticeHours: {
    mondayStart: process.env.DEFAULT_MONDAY_START || "09:00",
    mondayEnd: process.env.DEFAULT_MONDAY_END || "17:00",
    tuesdayStart: process.env.DEFAULT_TUESDAY_START || "09:00",
    tuesdayEnd: process.env.DEFAULT_TUESDAY_END || "17:00",
    wednesdayStart: process.env.DEFAULT_WEDNESDAY_START || "09:00",
    wednesdayEnd: process.env.DEFAULT_WEDNESDAY_END || "17:00",
    thursdayStart: process.env.DEFAULT_THURSDAY_START || "09:00",
    thursdayEnd: process.env.DEFAULT_THURSDAY_END || "17:00",
    fridayStart: process.env.DEFAULT_FRIDAY_START || "09:00",
    fridayEnd: process.env.DEFAULT_FRIDAY_END || "17:00",
    saturdayStart: process.env.DEFAULT_SATURDAY_START || "",
    saturdayEnd: process.env.DEFAULT_SATURDAY_END || "",
    sundayStart: process.env.DEFAULT_SUNDAY_START || "",
    sundayEnd: process.env.DEFAULT_SUNDAY_END || "",
  },

  // Feature flags
  features: {
    enableSMS: process.env.ENABLE_SMS === "true",
    enablePayments: process.env.ENABLE_PAYMENTS === "true",
    enableVideoConsultations: process.env.ENABLE_VIDEO === "true",
    enableTelehealthIntegration: process.env.ENABLE_TELEHEALTH === "true",
    enableElectronicHealthRecords: process.env.ENABLE_EHR === "true",
  },
};

/**
 * Parse and validate all environment variables related to general application settings
 */
function validateAppConfig() {
  // Validate port number
  if (
    isNaN(defaultConfig.server.port) ||
    defaultConfig.server.port < 0 ||
    defaultConfig.server.port > 65535
  ) {
    console.warn(`Invalid PORT: ${process.env.PORT}. Using default port 5000.`);
    defaultConfig.server.port = 5000;
  }

  // Add other validation logic as needed

  return {
    ...defaultConfig,
    // Add any computed properties
  };
}

module.exports = validateAppConfig();
