const crypto = require('crypto');
const axios = require('axios');
const { URLSearchParams } = require('url');
const paymentConfig = require('../config/payment');
const db = require('../db');
const { payments } = require('../schema/payment');
const { eq } = require('drizzle-orm');

const generateSignature = (data, passPhrase = null) => {
  const urlencoded = new URLSearchParams();
  for (let prop in data) {
    const value = data[prop];
    if (value) urlencoded.append(prop, value);
  }
  if (passPhrase !== null) {
    urlencoded.append('passphrase', passPhrase);
  }
  return crypto.createHash('md5').update(urlencoded.toString()).digest('hex');
};

const dataToString = (data) => {
  const urlencoded = new URLSearchParams();
  for (let prop in data) {
    const value = data[prop];
    if (value) urlencoded.append(prop, value);
  }
  return urlencoded.toString();
};

const generatePaymentIdentifier = async (payload, config) => {
  const pfParamString = dataToString(payload);
  const baseUrl =
    config.env === 'prod'
      ? 'https://www.payfast.co.za/onsite/process'
      : 'https://sandbox.payfast.co.za/onsite/process';
  try {
    const result = await axios.post(baseUrl, pfParamString);
    return result.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

class PaymentService {
  async initiatePayment(paymentDetails) {
    const paymentData = {
      ...paymentDetails,
      merchant_id: paymentConfig.merchant_id,
      merchant_key: paymentConfig.merchant_key,
      return_url: paymentConfig.return_url,
      cancel_url: paymentConfig.cancel_url,
      notify_url: paymentConfig.notify_url,
    };

    const signature = generateSignature(paymentData, paymentConfig.passPhrase);
    paymentData.signature = signature;

    const paymentIdentifier = await generatePaymentIdentifier(paymentData, {
      env: paymentConfig.env,
    });

    if (paymentIdentifier && paymentIdentifier.uuid) {
      return `https://www.payfast.co.za/eng/process?uuid=${paymentIdentifier.uuid}`;
    } else {
      // Check for the uuid in a different property, based on the return from Payfast
      const redirectUrl = paymentIdentifier.split('=')[1];
      if (redirectUrl) {
        return `https://www.payfast.co.za/eng/process?uuid=${redirectUrl}`;
      }
    }


    throw new Error('Could not get payment identifier');
  }

  async createPaymentRecord(paymentDetails) {
    const [newPayment] = await db
      .insert(payments)
      .values(paymentDetails)
      .returning();
    return newPayment;
  }

  async verifyItn(itnData, reqIp) {
    const validIps = [
      '3.163.236.237',
      '3.163.238.237',
      '3.163.251.237',
      '3.163.232.237',
      '3.163.241.237',
      '3.163.245.237',
      '3.163.248.237',
      '3.163.234.237',
      '3.163.237.237',
      '3.163.243.237',
      '3.163.247.237',
      '3.163.242.237',
      '3.163.244.237',
      '3.163.249.237',
      '3.163.252.237',
      '3.163.235.237',
      '3.163.239.237',
      '3.163.250.237',
      '3.163.233.237',
      '3.163.246.237',
      '3.163.240.237',
    ];

    if (!validIps.includes(reqIp)) {
      console.error('Invalid IP address for ITN:', reqIp);
      return false;
    }

    const receivedSignature = itnData.signature;
    delete itnData.signature;

    const generatedSignature = generateSignature(
      itnData,
      paymentConfig.passPhrase
    );

    if (receivedSignature === generatedSignature) {
      return true;
    } else {
      console.error('ITN signature mismatch');
      return false;
    }
  }

  async handleSuccessfulPayment(itnData) {
    const { m_payment_id, payment_status } = itnData;
    try {
      await db
        .update(payments)
        .set({ status: payment_status.toLowerCase(), updatedAt: new Date() })
        .where(eq(payments.id, m_payment_id));
      console.log(
        `Payment ${m_payment_id} status updated to ${payment_status}`
      );
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  }
}

module.exports = new PaymentService();