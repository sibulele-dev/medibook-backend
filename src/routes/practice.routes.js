const express = require("express");
const router = express.Router();
const practiceController = require("../controllers/practice.controller");
const { validateCreatePractice, validateUpdatePractice, validatePracticeId, validateGetAllPractices } = require("../middleware/validation.middleware");
const SubscriptionMiddleware = require("../middleware/subscription.middleware");

// All practice routes are now public
router.get("/", validateGetAllPractices, practiceController.getAllPractices);
router.get("/stats", practiceController.getPracticeStats);
router.get("/status", practiceController.checkDatabaseStatus);
router.get("/:id", validatePracticeId, practiceController.getPractice);
router.post("/", validateCreatePractice, SubscriptionMiddleware.checkPractitionerLimit, practiceController.createPractice);
router.put("/:id", validatePracticeId, validateUpdatePractice, practiceController.updatePractice);
router.delete("/:id", validatePracticeId, practiceController.deletePractice);

module.exports = router;
