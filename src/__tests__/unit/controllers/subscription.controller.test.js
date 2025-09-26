const subscriptionController = require('../../../controllers/subscription.controller');
const subscriptionService = require('../../../services/subscription.service');

describe('SubscriptionController', () => {
  describe('getAllSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const mockSubscriptions = [{ id: 1, name: 'Test Subscription' }];
      jest.spyOn(subscriptionService, 'getAllSubscriptions').mockResolvedValue(mockSubscriptions);

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await subscriptionController.getAllSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, ...mockSubscriptions });
    });

    it('should return 500 if there is an error', async () => {
      jest.spyOn(subscriptionService, 'getAllSubscriptions').mockRejectedValue(new Error('Test Error'));

      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await subscriptionController.getAllSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Test Error',
      });
    });
  });
});
