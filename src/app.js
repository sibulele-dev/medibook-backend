/**
 * Medical Booking API - Express App Configuration
 *
 * This file sets up and configures the Express application, including middleware,
 * routes, error handling, and other application-wide settings.
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const logger = require("./utils/logger");
const errorMiddleware = require("./api/middleware/error.middleware");
const apiRoutes = require("./api/routes");

// Create Express app
const app = express();

// Load environment variables based on environment
const isProduction = process.env.NODE_ENV === "production";

// Security headers
app.use(helmet());

// Compression middleware
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: isProduction
    ? process.env.FRONTEND_URL
    : ["http://localhost:3000", "http://localhost:8000"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Request body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Request logging
const morganFormat = isProduction ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    skip: (req, res) => res.statusCode < 400,
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use("/api", apiLimiter);

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API documentation
if (!isProduction) {
  try {
    const swaggerDocument = YAML.load(path.join(__dirname, "../swagger.yaml"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    logger.info("Swagger documentation loaded successfully");
  } catch (error) {
    logger.warn("Failed to load Swagger documentation:", error.message);
  }
}

// API routes
app.use("/api", apiRoutes);

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handling middleware
app.use(errorMiddleware);

module.exports = app;
