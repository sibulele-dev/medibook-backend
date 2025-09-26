const subscriptionService = require("../services/subscription.service");

class SubscriptionController {
  async getAllSubscriptions(req, res) {
    try {
      const subscriptions = await subscriptionService.getAllSubscriptions(req.query);
      res.status(200).json({ success: true, ...subscriptions });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch subscriptions",
      });
    }
  }
}

module.exports = new SubscriptionController();
