const { logger } = require("../../utils/logger");
const {
  PrismaClientKnownRequestError,
} = require("@prisma/client/runtime/library");

/**
 * Global error handling middleware
 * Catches all errors and formats appropriate responses
 */
exports.errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id,
  });

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - Invalid token",
      error: err.name,
    });
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors,
    });
  }

  // Handle custom API errors with status codes
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Handle file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large",
    });
  }

  // Default error response for unhandled errors
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
};

/**
 * Handle specific Prisma database errors
 */
function handlePrismaError(err, res) {
  // P2002: Unique constraint violation
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: `A record with this ${err.meta?.target?.join(
        ", "
      )} already exists`,
      error: "Duplicate record",
    });
  }

  // P2003: Foreign key constraint failed
  if (err.code === "P2003") {
    return res.status(400).json({
      success: false,
      message: `Foreign key constraint failed on field: ${err.meta?.field_name}`,
      error: "Invalid reference",
    });
  }

  // P2025: Record not found
  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: err.meta?.cause || "Record not found",
      error: "Not found",
    });
  }

  // Default Prisma error
  return res.status(500).json({
    success: false,
    message: "Database error",
    error: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
}

/**
 * Middleware to handle 404 errors for undefined routes
 */
exports.notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Request ID middleware
 * Assigns a unique ID to each request for tracing
 */
exports.requestIdMiddleware = (req, res, next) => {
  req.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  res.setHeader("X-Request-ID", req.id);
  next();
};
