/**
 * Config Index
 *
 * This file aggregates and exports all configuration modules to provide
 * a single entry point for accessing application configuration.
 */

const appConfig = require("./app");
const authConfig = require("./auth");
const databaseConfig = require("./database");
const emailConfig = require("./email");

/**
 * Global application configuration
 *
 * Combines all configuration modules into a single object for convenience and
 * adds computed/derived configuration values based on other settings.
 */
const config = {
  app: appConfig,
  auth: authConfig,
  database: databaseConfig,
  email: emailConfig,

  // Environment checks (convenience shortcuts)
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
  isTest: process.env.NODE_ENV === "test",

  // Computed configuration values
  cors: {
    origin: appConfig.isProduction
      ? [appConfig.frontend.url, appConfig.frontend.adminUrl].filter(Boolean)
      : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Practice-ID"],
  },

  // Root directory paths
  paths: {
    root: process.cwd(),
    src: `${process.cwd()}/src`,
    uploads: `${process.cwd()}/${appConfig.uploads.localStoragePath}`,
  },
};

// Log configuration on startup (excluding sensitive information)
if (process.env.LOG_CONFIG === "true" && config.isDevelopment) {
  const safeConfig = { ...config };

  // Remove sensitive information before logging
  if (safeConfig.auth && safeConfig.auth.jwt) {
    safeConfig.auth.jwt.secret = "[REDACTED]";
  }

  if (safeConfig.email && safeConfig.email.smtp) {
    safeConfig.email.smtp.auth = "[REDACTED]";
  }

  if (safeConfig.email && safeConfig.email.sendgrid) {
    safeConfig.email.sendgrid.apiKey = "[REDACTED]";
  }

  if (safeConfig.email && safeConfig.email.mailgun) {
    safeConfig.email.mailgun.apiKey = "[REDACTED]";
  }

  console.log(
    "Application Configuration:",
    JSON.stringify(safeConfig, null, 2)
  );
}

module.exports = config;
