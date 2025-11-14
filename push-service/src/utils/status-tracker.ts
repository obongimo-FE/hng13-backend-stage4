import { createClient } from 'redis';

interface NotificationStatus {
  notification_id: string;
  correlation_id: string;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'bounced';
  type: 'email' | 'push';
  user_id: string;
  timestamp: string;
  error?: string;
  message_id?: string;
}

export class StatusTracker {
  private redisClient: ReturnType<typeof createClient> | null = null;
  private redisUrl: string;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
  }

  async connect(): Promise<void> {
    try {
      this.redisClient = createClient({ url: this.redisUrl });
      
      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('✅ Connected to Redis for status tracking');
    } catch (error: any) {
      console.error('Failed to connect to Redis:', error.message);
      throw error;
    }
  }

  async updateStatus(status: NotificationStatus): Promise<void> {
    if (!this.redisClient) {
      console.warn('Redis not connected, skipping status update');
      return;
    }

    try {
      const key = `notification:${status.correlation_id}`;
      await this.redisClient.set(
        key,
        JSON.stringify(status),
        { EX: 86400 }
      );
    } catch (error: any) {
      console.error('Failed to update status:', error.message);
    }
  }

  async getStatus(correlationId: string): Promise<NotificationStatus | null> {
    if (!this.redisClient) {
      return null;
    }

    try {
      const key = `notification:${correlationId}`;
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error: any) {
      console.error('Failed to get status:', error.message);
      return null;
    }
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

