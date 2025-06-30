const userService = require("../services/user.service");

/**
 * Session cleanup utility
 * This script can be run periodically to clean up expired sessions
 */

class SessionCleanup {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Run the cleanup process
   */
  async runCleanup() {
    if (this.isRunning) {
      console.log("Cleanup already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("Starting session cleanup...");

    try {
      const cleanedCount = await userService.cleanupExpiredSessions();
      const stats = await userService.getSessionStats();

      console.log(`Cleanup completed: ${cleanedCount} sessions cleaned`);
      console.log(
        `Current stats: ${stats.totalSessions} total sessions, ${stats.uniqueUsers} unique users`
      );

      return { cleanedCount, stats };
    } catch (error) {
      console.error("Error during session cleanup:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start periodic cleanup (every hour by default)
   */
  startPeriodicCleanup(intervalMs = 60 * 60 * 1000) {
    console.log(
      `Starting periodic session cleanup every ${
        intervalMs / 1000 / 60
      } minutes`
    );

    // Run initial cleanup
    this.runCleanup();

    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup().catch((error) => {
        console.error("Periodic cleanup failed:", error);
      });
    }, intervalMs);
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log("Periodic session cleanup stopped");
    }
  }

  /**
   * Get current session statistics
   */
  async getStats() {
    try {
      return await userService.getSessionStats();
    } catch (error) {
      console.error("Error getting session stats:", error);
      throw error;
    }
  }
}

// Export singleton instance
const sessionCleanup = new SessionCleanup();

module.exports = sessionCleanup;

// If this file is run directly, start periodic cleanup
if (require.main === module) {
  console.log("Starting session cleanup utility...");
  sessionCleanup.startPeriodicCleanup();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("Shutting down session cleanup...");
    sessionCleanup.stopPeriodicCleanup();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("Shutting down session cleanup...");
    sessionCleanup.stopPeriodicCleanup();
    process.exit(0);
  });
}
