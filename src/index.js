/**
 * Medical Booking API - Server Entry Point
 *
 * This is the main entry point for the medical booking API server. It initializes
 * the Express application, connects to the database, sets up error handling,
 * and starts the server on the specified port.
 */

const app = require("./app");
const { PrismaClient } = require("@prisma/client");
const logger = require("./utils/logger");
const config = require("./config/database");
const notificationService = require("./services/notification.service");

// Environment variables
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  // Graceful shutdown
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Graceful shutdown not required here as the program can continue
});

// Connect to the database and start the server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("Database connection established");

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
      logger.info(
        `API Documentation available at http://localhost:${PORT}/api-docs`
      );
    });

    // Graceful shutdown
    const shutdownGracefully = async () => {
      logger.info("Shutting down gracefully...");

      // Close server
      server.close(async () => {
        logger.info("HTTP server closed");

        try {
          // Disconnect from database
          await prisma.$disconnect();
          logger.info("Database connection closed");

          // Exit process
          process.exit(0);
        } catch (err) {
          logger.error("Error during shutdown:", err);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 10000); // 10 seconds
    };

    // Listen for termination signals
    process.on("SIGTERM", shutdownGracefully);
    process.on("SIGINT", shutdownGracefully);

    // Initialize any background tasks or services
    if (NODE_ENV === "production") {
      // Start appointment reminder scheduler
      notificationService.initializeReminderScheduler();
    }

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
if (NODE_ENV !== "test") {
  startServer();
}

// Export for testing purposes
module.exports = { startServer, prisma };
