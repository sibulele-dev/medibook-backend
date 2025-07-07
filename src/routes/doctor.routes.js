const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctor.controller");

// GET /api/doctors - Get all doctors
router.get("/", doctorController.getAllDoctors);

// POST /api/doctors - Register a new doctor
router.post("/", doctorController.registerDoctor);

module.exports = router;
