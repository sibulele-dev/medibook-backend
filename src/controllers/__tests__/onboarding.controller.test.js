const onboardingController = require('../onboarding.controller');

// Simple mock response object
function createRes() {
    const res = {};
    res.status = (code) => {
        res._status = code;
        return res;
    };
    res.json = (obj) => {
        res._body = obj;
        return res;
    };
    return res;
}

// Mock request with query
(async () => {
    console.log('Running simple smoke tests for onboarding.controller');

    // Test checkEmail with missing email
    const req1 = { query: {} };
    const res1 = createRes();
    await onboardingController.checkEmail(req1, res1);
    console.log('checkEmail missing email status:', res1._status);

    // Test onboardDoctor with missing body should catch validation error
    const req2 = { body: {} };
    const res2 = createRes();
    await onboardingController.onboardDoctor(req2, res2);
    console.log('onboardDoctor with empty body status:', res2._status);

    console.log('Done');
})();