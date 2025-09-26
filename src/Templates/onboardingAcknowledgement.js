const onboardingAcknowledgementEmail = (doctorName) => {
  return `
    <h1>Welcome to MediBook, ${doctorName}!</h1>
    <p>Thank you for signing up for MediBook. We have received your application and it is currently under review.</p>
    <p>We will verify your details and send you another email once your account has been approved and activated.</p>
    <p>In the meantime, if you have any questions, please don't hesitate to contact our support team.</p>
    <p>Best regards,</p>
    <p>The MediBook Team</p>
  `;
};

module.exports = onboardingAcknowledgementEmail;