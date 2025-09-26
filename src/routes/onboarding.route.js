const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboarding.controller');

router.post('/doctor', onboardingController.onboardDoctor);
router.get('/check-email', onboardingController.checkEmail);

module.exports = router;