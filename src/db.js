const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
require("dotenv").config();

// Configurable Postgres client (supports local and hosted providers like Supabase)
const {
  DATABASE_URL,
  DB_MAX,
  DB_IDLE_TIMEOUT,
  DB_CONNECT_TIMEOUT,
  DB_SSL,
} = process.env;

// Interpret SSL option: "require" | "true" -> TLS; anything else -> undefined (no SSL)
const sslOption = DB_SSL === "require" ? "require" : DB_SSL === "true" ? true : undefined;

const client = postgres(DATABASE_URL, {
  max: parseInt(DB_MAX || "10", 10),
  idle_timeout: parseInt(DB_IDLE_TIMEOUT || "20", 10),
  connect_timeout: parseInt(DB_CONNECT_TIMEOUT || "10", 10),
  ssl: sslOption,
  onnotice: () => {},
});

const db = drizzle(client);

module.exports = db;
