const subscriptionService = require("../services/subscription.service");
const paymentService = require("../services/payment.service");

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

  async checkout(req, res) {
    try {
      const { userId, planId, amount, itemName, itemDescription } = req.body;

      // 1. Create a subscription record
      const subscription = await subscriptionService.createSubscription({
        userId,
        planId,
        status: 'pending',
      });

      // 2. Initiate payment with PayFast
      const paymentUrl = await paymentService.initiatePayment({
        amount,
        itemName,
        itemDescription,
        m_payment_id: subscription.id, // Pass subscription ID to PayFast
      });

      res.status(200).json({ success: true, paymentUrl });
    } catch (error) {
      console.error('Error during checkout:', error);
      res.status(500).json({ success: false, message: 'Failed to checkout' });
    }
  }

  async getSubscriptionByDoctorId(req, res) {
    try {
      const { doctorId } = req.params;
      const subscription = await subscriptionService.getSubscriptionByDoctorId(doctorId);
      if (subscription) {
        res.status(200).json({ success: true, subscription });
      } else {
        res.status(404).json({ success: false, message: "Subscription not found" });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch subscription",
      });
    }
  }
}

module.exports = new SubscriptionController();
