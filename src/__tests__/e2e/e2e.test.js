const request = require('supertest');
const express = require('express');
const subscriptionRoutes = require('../../routes/subscription.routes');

const app = express();
app.use('/subscriptions', subscriptionRoutes);

describe('E2E Tests', () => {
  describe('GET /subscriptions', () => {
    it('should return a list of subscriptions', async () => {
      const response = await request(app).get('/subscriptions');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.subscriptions)).toBe(true);
    });
  });
});
