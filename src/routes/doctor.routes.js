const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctor.controller");

// GET /api/doctors - Get all doctors
router.get("/", doctorController.getAllDoctors);

// GET /api/doctors/:id - Get doctor by ID
router.get("/:id", doctorController.getDoctorById);

// POST /api/doctors - Register a new doctor
router.post("/", doctorController.registerDoctor);

// PUT /api/doctors/:id - Update doctor
router.put("/:id", doctorController.updateDoctor);

// DELETE /api/doctors/:id - Delete doctor
router.delete("/:id", doctorController.deleteDoctor);

module.exports = router;
