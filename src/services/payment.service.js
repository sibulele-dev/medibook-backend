const payfast = require('payfast-lib');
const paymentConfig = require('../config/payment');
const db = require('../db');
const { payments } = require('../schema/payment');
const { eq } = require('drizzle-orm');

class PaymentService {
  constructor() {
    this.payfast = new payfast(paymentConfig);
    this.listenForPayments();
  }

  async initiatePayment(paymentDetails) {
    const paymentData = {
      amount: paymentDetails.amount,
      item_name: paymentDetails.itemName,
      item_description: paymentDetails.itemDescription,
    };

    const paymentUrl = await this.payfast.createPayment(paymentData);
    return paymentUrl;
  }

  listenForPayments() {
    this.payfast.on('payment-processed', async (data) => {
      console.log('Payment processed:', data);
      const { pf_payment_id, payment_status } = data;

      try {
        await db.update(payments)
          .set({ status: payment_status.toLowerCase(), updatedAt: new Date() })
          .where(eq(payments.pfPaymentId, pf_payment_id));
        console.log(`Payment ${pf_payment_id} status updated to ${payment_status}`);
      } catch (error) {
        console.error('Error updating payment status:', error);
      }
    });

    this.payfast.on('payment-error', (err) => {
      console.error('Payment error:', err);
    });
  }

  async createPaymentRecord(paymentDetails) {
    const [newPayment] = await db.insert(payments).values(paymentDetails).returning();
    return newPayment;
  }
}

module.exports = new PaymentService();
