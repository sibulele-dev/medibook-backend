require("dotenv").config();

const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Server
  server: {
    port: process.env.PORT || 3002,
    nodeEnv: process.env.NODE_ENV || "development",
  },

  // Validation
  validation: {
    email: {
      regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },
};

module.exports = config;
