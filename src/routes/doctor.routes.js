const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctor.controller");

// GET /api/doctors - Get all doctors
router.get("/", doctorController.getAllDoctors);

// GET /api/doctors/:id - Get doctor by ID
router.get("/:id", doctorController.getDoctorById);

// POST /api/doctors - Register a new doctor
router.post("/", doctorController.registerDoctor);

<<<<<<< HEAD
// GET /api/doctors/:id - Get a single doctor by userId
router.get("/:id", doctorController.getDoctorById);

// PATCH /api/doctors/:id - Update a doctor by userId
router.put("/:id", doctorController.updateDoctor);

// DELETE /api/doctors/:id - Delete a doctor by userId
=======
// PUT /api/doctors/:id - Update doctor
router.put("/:id", doctorController.updateDoctor);

// DELETE /api/doctors/:id - Delete doctor
>>>>>>> login
router.delete("/:id", doctorController.deleteDoctor);

module.exports = router;
