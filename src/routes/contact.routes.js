const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contact.controller");
const { validateContactForm } = require("../middleware/validation.middleware");

router.post("/", validateContactForm, contactController.sendContactForm);

module.exports = router;
