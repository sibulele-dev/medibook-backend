const paymentService = require('../services/payment.service');
const paymentConfig = require('../config/payment');

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
    // The payfast-lib handles the ITN verification and emits an event.
    // We just need to acknowledge receipt of the ITN.
    res.status(200).send('OK');
  }

  async returnPayment(req, res) {
    // Redirect user to the frontend success page
    res.redirect(paymentConfig.returnUrl);
  }

  async cancelPayment(req, res) {
    // Redirect user to the frontend cancel page
    res.redirect(paymentConfig.cancelUrl);
  }
}

module.exports = new PaymentController();