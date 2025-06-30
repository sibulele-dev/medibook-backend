const { migrate } = require("drizzle-orm/postgres-js/migrator");
const db = require("../db");

// Run migrations
const runMigrations = async () => {
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
};

module.exports = { runMigrations };
