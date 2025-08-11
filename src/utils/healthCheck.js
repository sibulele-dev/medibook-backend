const db = require("../db");

/**
 * Performs a health check of critical system components
 * @returns {Promise<Object>} Health status of various components
 */
async function checkHealth() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: "unknown",
        responseTime: null,
        error: null,
      },
    },
    uptime: process.uptime(),
    memory: {
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
    },
  };

  // Check database connection
  try {
    const start = Date.now();
    await db.execute("SELECT 1");
    health.services.database = {
      status: "ok",
      responseTime: Date.now() - start,
      error: null,
    };
  } catch (error) {
    health.status = "error";
    health.services.database = {
      status: "error",
      responseTime: null,
      error: error.message,
    };
  }

  return health;
}

module.exports = { checkHealth };
