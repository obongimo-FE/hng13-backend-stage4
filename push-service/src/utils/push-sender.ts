import admin from 'firebase-admin';

interface PushConfig {
  fcm_service_account?: string; // Path to service account JSON
  fcm_service_account_json?: string; // Service account JSON as string
}

interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  link?: string;
}

export class PushSender {
  private initialized: boolean = false;

  constructor(config: PushConfig) {
    this.initializeFCM(config);
  }

  private initializeFCM(config: PushConfig): void {
    try {
      if (config.fcm_service_account_json) {
        // Initialize with JSON string
        const serviceAccount = JSON.parse(config.fcm_service_account_json);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        this.initialized = true;
        console.log('✅ Firebase Admin initialized from JSON');
      } else if (config.fcm_service_account) {
        // Initialize with file path
        const serviceAccount = require(config.fcm_service_account);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        this.initialized = true;
        console.log('✅ Firebase Admin initialized from file');
      } else {
        console.warn('⚠️ No FCM configuration found. Push notifications will be simulated.');
      }
    } catch (error: any) {
      console.error('Failed to initialize Firebase Admin:', error.message);
      console.warn('⚠️ Push notifications will be simulated.');
    }
  }

  async validateToken(token: string): Promise<boolean> {
    if (!this.initialized) {
      // In development, accept any token format
      return Boolean(token && token.length > 0);
    }

    try {
      // FCM tokens are typically long strings
      // Basic validation: check format
      return token.length > 100 && token.includes(':');
    } catch (error) {
      return false;
    }
  }

  async sendPush(message: PushMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Validate token
    if (!message.token) {
      return {
        success: false,
        error: 'Push token is required'
      };
    }

    const isValidToken = await this.validateToken(message.token);
    if (!isValidToken) {
      return {
        success: false,
        error: 'Invalid push token format'
      };
    }

    if (!this.initialized) {
      // Simulate push notification in development
      console.log('📱 [SIMULATED] Push notification sent:');
      console.log(`   To: ${message.token.substring(0, 20)}...`);
      console.log(`   Title: ${message.title}`);
      console.log(`   Body: ${message.body}`);
      console.log(`   Data:`, message.data);
      
      return {
        success: true,
        messageId: `simulated-${Date.now()}`
      };
    }

    try {
      const notification: admin.messaging.Notification = {
        title: message.title,
        body: message.body
      };
      
      if (message.imageUrl) {
        notification.imageUrl = message.imageUrl;
      }
      
      const payload: admin.messaging.Message = {
        token: message.token,
        notification,
        data: message.data || {},
        android: {
          priority: 'high' as const
        },
        apns: {
          headers: {
            'apns-priority': '10'
          }
        }
      };
      
      if (message.link) {
        payload.webpush = {
          fcmOptions: {
            link: message.link
          }
        };
      }

      const response = await admin.messaging().send(payload);
      console.log(`✅ Push notification sent: ${response}`);

      return {
        success: true,
        messageId: response
      };
    } catch (error: any) {
      console.error('❌ Failed to send push notification:', error.message);
      
      // Handle invalid token errors
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        return {
          success: false,
          error: 'Invalid or unregistered device token'
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

