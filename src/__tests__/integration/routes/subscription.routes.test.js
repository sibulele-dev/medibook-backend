const request = require('supertest');
const express = require('express');
const subscriptionRoutes = require('../../../routes/subscription.routes');
const subscriptionService = require('../../../services/subscription.service');

const app = express();
app.use('/subscriptions', subscriptionRoutes);

describe('Subscription Routes', () => {
  describe('GET /subscriptions', () => {
    it('should return all subscriptions', async () => {
      const mockSubscriptions = [{ id: 1, name: 'Test Subscription' }];
      jest.spyOn(subscriptionService, 'getAllSubscriptions').mockResolvedValue(mockSubscriptions);

      const response = await request(app).get('/subscriptions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, ...mockSubscriptions });
    });

    it('should return 500 if there is an error', async () => {
      jest.spyOn(subscriptionService, 'getAllSubscriptions').mockRejectedValue(new Error('Test Error'));

      const response = await request(app).get('/subscriptions');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Test Error',
      });
    });
  });
});
