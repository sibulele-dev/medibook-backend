require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

// Import routes
const userRoutes = require("./routes/user.routes");
const practiceRoutes = require("./routes/practice.routes");
const paymentRoutes = require("./routes/payment.routes");
const appointmentRoutes = require("./routes/appointment.routes");

// Import email configuration
const { verifyConnection: verifyEmailConnection } = require("./config/email");

// Import security middleware
const { 
  securityHeadersMiddleware, 
  tokenFingerprintMiddleware, 
  requestValidationMiddleware,
  rateLimitHeadersMiddleware 
} = require("./middleware/security.middleware");

// Import admin security middleware
const { 
  requireAdminIPWhitelist,
  requireAdminSessionTimeout,
  requireAdminActionRateLimit,
  detectPrivilegeEscalation
} = require("./middleware/admin-security.middleware");

const app = express();
const PORT = process.env.PORT;

// Security middleware (applied first)
// app.use(securityHeadersMiddleware);
// app.use(tokenFingerprintMiddleware);
// app.use(requestValidationMiddleware);
// app.use(rateLimitHeadersMiddleware);

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.FRONTEND_URL, "https://your-frontend-app.onrender.com"] // Add your actual frontend URL
        : process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Enhanced helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Admin security middleware for admin routes
// app.use("/api/users", detectPrivilegeEscalation());
// app.use("/api/users", requireAdminActionRateLimit(100, 15)); // 100 actions per 15 minutes
// app.use("/api/users", requireAdminSessionTimeout(30)); // 30 minute session timeout

// Routes
app.use("/api/users", userRoutes);
app.use("/api/practices", practiceRoutes);
app.use("/api/doctors", require("./routes/doctor.routes"));
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Server is running!",
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Database test route
app.get("/db-test", async (req, res) => {
  try {
    // Test database connection with a simple query
    const result = await db.execute("SELECT NOW() as current_time");
    res.json({
      message: "Database connection successful!",
      timestamp: result[0].current_time,
      database: "PostgreSQL with Drizzle ORM",
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      error: "Database connection failed",
      message: error.message,
    });
  }
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);

  // Test database connection
  try {
    const result = await db.execute("SELECT 1 as connected");
    if (result && result[0] && result[0].connected === 1) {
      console.log("✅ Database: PostgreSQL with Drizzle ORM (connected)");
    } else {
      console.log(
        "⚠️  Database: PostgreSQL with Drizzle ORM (connection test failed)"
      );
    }
  } catch (error) {
    console.log("❌ Database: PostgreSQL with Drizzle ORM (connection failed)");
    if (error.cause && error.cause.code === "ECONNREFUSED") {
      console.log("   → PostgreSQL server is not running or not accessible");
      console.log(
        "   → Please check if PostgreSQL is running on localhost:5432"
      );
      console.log("   → Or update DATABASE_URL in your .env file");
    } else {
      console.log("   → Error:", error.message);
    }
    console.log(
      "   → Server will continue running without database connection"
    );
  }

  // Test email connection
  try {
    const emailConnected = await verifyEmailConnection();
    if (emailConnected) {
      console.log("📧 Email: Nodemailer (connected)");
    } else {
      console.log("⚠️  Email: Nodemailer (connection failed)");
    }
  } catch (error) {
    console.log("❌ Email: Nodemailer (connection failed)");
    console.log("   → Check your EMAIL_* environment variables");
    console.log("   → See email-config-example.txt for configuration");
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  // Close server
  server.close(() => {
    console.log("🌐 HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error(
      "⚠️  Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
