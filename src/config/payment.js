require('dotenv').config();

const requiredEnv = [
  'PAYFAST_MERCHANT_ID',
  'PAYFAST_MERCHANT_KEY',
  'PAYFAST_PASSPHRASE',
];

requiredEnv.forEach(name => {
  if (!process.env[name]) {
    throw new Error(`Environment variable ${name} is missing`);
  }
});

const paymentConfig = {
  merchantId: process.env.PAYFAST_MERCHANT_ID,
  merchantKey: process.env.PAYFAST_MERCHANT_KEY,
  passphrase: process.env.PAYFAST_PASSPHRASE,
  returnUrl: process.env.PAYFAST_RETURN_URL || 'http://localhost:3000/payment/success',
  cancelUrl: process.env.PAYFAST_CANCEL_URL || 'http://localhost:3000/payment/cancel',
  notifyUrl: process.env.PAYFAST_NOTIFY_URL || 'http://localhost:3001/api/payments/notify',
  env: process.env.PAYFAST_ENV || 'sandbox',
  sandboxUrl: process.env.PAYFAST_SANDBOX_URL,
  productionUrl: 'https://www.payfast.co.za/eng/process',
  // The baseUrl is determined by the env, the payfast-lib uses this to determine the correct PayFast URL
  get baseUrl() {
    return this.env === 'sandbox' ? this.sandboxUrl : this.productionUrl;
  }
};

module.exports = paymentConfig;
