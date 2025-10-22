const paymentService = require('../services/payment.service');
const paymentConfig = require('../config/payment');
const subscriptionService = require('../services/subscription.service');

class PaymentController {
  async initiatePayment(req, res) {
    try {
      const { amount, itemName, itemDescription } = req.body;
      const userId = req.user?.id; // Assuming you have user information in the request

      // 1. Create a payment record in your database
      const paymentRecord = await paymentService.createPaymentRecord({
        amount,
        itemName,
        itemDescription,
        userId,
      });

      // 2. Initiate payment with PayFast
      const paymentUrl = await paymentService.initiatePayment({
        amount,
        itemName,
        itemDescription,
        m_payment_id: paymentRecord.id, // Pass your internal payment ID to PayFast
      });

      res.status(200).json({ success: true, paymentUrl });
    } catch (error) {
      console.error('Error initiating payment:', error);
      res.status(500).json({ success: false, message: 'Failed to initiate payment' });
    }
  }

  async notifyPayment(req, res) {
    const itnData = req.body;
    const reqIp = req.ip;

    try {
      const isValid = await paymentService.verifyItn(itnData, reqIp);
      if (isValid) {
        await paymentService.handleSuccessfulPayment(itnData);
      }
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling ITN:', error);
      res.status(500).send('Error');
    }
  }

  async returnPayment(req, res) {
    // Redirect user to the frontend success page
    res.redirect(paymentConfig.returnUrl);
  }

  async cancelPayment(req, res) {
    const { m_payment_id } = req.query;
    try {
      await subscriptionService.updateSubscriptionStatus(m_payment_id, 'cancelled');
      // Redirect user to the frontend cancel page
      res.redirect(paymentConfig.cancelUrl);
    } catch (error) {
      console.error('Error cancelling payment:', error);
      res.redirect(paymentConfig.cancelUrl);
    }
  }
}

module.exports = new PaymentController();