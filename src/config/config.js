require("dotenv").config();

const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-this-in-production",
    expiresIn: "12h",
  },

  // Server
  server: {
    port: process.env.PORT || 3002,
    nodeEnv: process.env.NODE_ENV || "development",
  },

  // Validation
  validation: {
    password: {
      minLength: 8,
      regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
    },
    email: {
      regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },
};

module.exports = config;
