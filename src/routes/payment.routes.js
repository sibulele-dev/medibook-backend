const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { validateInitiatePayment } = require("../middleware/validation.middleware");


// Initiate a payment
router.post("/initiate",  validateInitiatePayment, paymentController.initiatePayment);

// PayFast ITN callback
router.post("/notify", paymentController.notifyPayment);

// User is redirected here after a successful payment
router.get("/return", paymentController.returnPayment);

// User is redirected here after cancelling a payment
router.get("/cancel", paymentController.cancelPayment);

module.exports = router;