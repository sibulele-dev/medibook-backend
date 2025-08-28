const emailService = require("../services/email.service");

const sendContactForm = async (req, res) => {
  const { firstName, lastName, email, message } = req.body;

  if (!firstName || !lastName || !email || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    await emailService.sendContactEmail({ firstName, lastName, email, message });
    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending contact form:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

module.exports = {
  sendContactForm,
};
