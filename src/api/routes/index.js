const express = require("express");
const router = express.Router();

// Import all route modules
const authRoutes = require("./auth.routes");
const usersRoutes = require("./users.routes");
const practicesRoutes = require("./practices.routes");
const doctorsRoutes = require("./doctors.routes");
const patientsRoutes = require("./patients.routes");
const appointmentsRoutes = require("./appointments.routes");
const schedulesRoutes = require("./schedules.routes");
const servicesRoutes = require("./services.routes");
const adminRoutes = require("./admin.routes");

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/practices", practicesRoutes);
router.use("/doctors", doctorsRoutes);
router.use("/patients", patientsRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/schedules", schedulesRoutes);
router.use("/services", servicesRoutes);
router.use("/admin", adminRoutes);

// API health check
router.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date() });
});

module.exports = router;
