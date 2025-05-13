/**
 * Logging utility for the medical booking app
 */
const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "info";
};

// Define colors for different log levels
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Add colors to Winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

// Define transports for logging
const transports = [
  // Console logging
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        const metaStr = Object.keys(meta).length
          ? JSON.stringify(meta, null, 2)
          : "";
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    ),
  }),

  // File logging - all logs
  new winston.transports.File({
    filename: path.join(logDir, "combined.log"),
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }),

  // File logging - errors only
  new winston.transports.File({
    filename: path.join(logDir, "error.log"),
    level: "error",
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "exceptions.log"),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "rejections.log"),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Enhanced logging with request context
 * @param {Object} req - Express request object
 * @returns {Object} Logger with request context
 */
const requestLogger = (req) => {
  const requestId = req.id || Math.random().toString(36).substring(2, 15);
  const userId = req.user?.id || "unauthenticated";
  const practiceId = req.user?.practiceId || "none";

  const logContext = {
    requestId,
    userId,
    practiceId,
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
  };

  return {
    error: (message, meta = {}) =>
      logger.error(message, { ...logContext, ...meta }),
    warn: (message, meta = {}) =>
      logger.warn(message, { ...logContext, ...meta }),
    info: (message, meta = {}) =>
      logger.info(message, { ...logContext, ...meta }),
    http: (message, meta = {}) =>
      logger.http(message, { ...logContext, ...meta }),
    debug: (message, meta = {}) =>
      logger.debug(message, { ...logContext, ...meta }),
  };
};

// Express middleware to log HTTP requests
const httpLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "unknown",
    });
  });
  next();
};

module.exports = {
  logger,
  requestLogger,
  httpLogger,
};
