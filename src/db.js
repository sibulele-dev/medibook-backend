const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
require("dotenv").config();

// Create postgres client with proper configuration for Supabase
const client = postgres(process.env.DATABASE_URL, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
  ssl: "require", // Enable SSL for Supabase
  onnotice: () => {}, // Suppress notice messages
});

// Create Drizzle instance
const db = drizzle(client);

module.exports = db;
