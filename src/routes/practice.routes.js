const express = require("express");
const router = express.Router();
const practiceController = require("../controllers/practice.controller");

// All practice routes are now public
router.get("/", practiceController.getAllPractices);
router.get("/stats", practiceController.getPracticeStats);
router.get("/status", practiceController.checkDatabaseStatus);
router.get("/:id", practiceController.getPractice);
router.post("/", practiceController.createPractice);
router.put("/:id", practiceController.updatePractice);
router.delete("/:id", practiceController.deletePractice);

module.exports = router;
