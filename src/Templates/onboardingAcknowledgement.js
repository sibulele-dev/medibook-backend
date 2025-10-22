// Deprecated placeholder.
// This file used to export an HTML template. The project now uses EJS templates
// located at `onboardingAcknowledgement.ejs` and the email service renders that
// file with `ejs.renderFile`. If this module is required anywhere it is likely
// an accidental import and will throw to make the issue obvious.

module.exports = function onboardingAcknowledgementDeprecated() {
  throw new Error(
    'Deprecated: Please use onboardingAcknowledgement.ejs and render with ejs.renderFile in email.service.js'
  );
};