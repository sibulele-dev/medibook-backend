const express = require("express");
const router = express.Router();
const practiceController = require("../controllers/practice.controller");
const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/auth.middleware");

// Apply admin authentication to all practice routes
// Temporarily commented out for testing
// router.use(authenticateToken, requireAdmin);

// GET /api/practices - Get all practices with pagination and filters
router.get("/", practiceController.getAllPractices);

// GET /api/practices/stats - Get practice statistics
router.get("/stats", practiceController.getPracticeStats);

// GET /api/practices/:id - Get practice by ID
router.get("/:id", practiceController.getPractice);

// POST /api/practices - Create new practice
router.post("/", practiceController.createPractice);

// PUT /api/practices/:id - Update practice
router.put("/:id", practiceController.updatePractice);

// DELETE /api/practices/:id - Delete practice
router.delete("/:id", practiceController.deletePractice);

module.exports = router;
