import { NotificationService } from '../../src/services/notification.service.js';

// Mock the queue service
jest.mock('../../src/services/queue.service.js', () => ({
  queueService: {
    publishToQueue: jest.fn().mockResolvedValue(true),
    isConnected: true
  }
}));

describe('NotificationService', () => {
  describe('queueNotification', () => {
    it('should queue a notification successfully', async () => {
      const notificationData = {
        user_id: 'user_123',
        template_id: 'welcome_email',
        type: 'email',
        variables: { name: 'John' },
        priority: 'normal'
      };

      const result = await NotificationService.queueNotification(notificationData);

      expect(result).toHaveProperty('notification_id');
      expect(result).toHaveProperty('correlation_id');
      expect(result.status).toBe('queued');
    });
  });
});