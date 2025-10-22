const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscription.controller");

router.get("/", subscriptionController.getAllSubscriptions);
router.post("/checkout", subscriptionController.checkout);
router.get("/:doctorId", subscriptionController.getSubscriptionByDoctorId);

module.exports = router;
