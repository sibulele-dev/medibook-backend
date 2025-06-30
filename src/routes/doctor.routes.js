const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctor.controller");

// GET /api/doctors - Get all doctors
router.get("/", doctorController.getAllDoctors);

module.exports = router;
