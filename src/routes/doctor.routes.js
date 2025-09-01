const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctor.controller");
const { validateRegisterDoctor, validateUpdateDoctor, validateDoctorId, validateGetAllDoctors } = require("../middleware/validation.middleware");

// GET /api/doctors - Get all doctors
router.get("/", validateGetAllDoctors, doctorController.getAllDoctors);

// GET /api/doctors/:id - Get doctor by ID
router.get("/:id", validateDoctorId, doctorController.getDoctorById);

// POST /api/doctors - Register a new doctor
router.post("/", validateRegisterDoctor, doctorController.registerDoctor);

// PUT /api/doctors/:id - Update a doctor by ID
router.put("/:id", validateDoctorId, validateUpdateDoctor, doctorController.updateDoctor);

// DELETE /api/doctors/:id - Delete a doctor by ID
router.delete("/:id", validateDoctorId, doctorController.deleteDoctor);

module.exports = router;
