import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_secure?: boolean;
  // Or use API providers
  sendgrid_api_key?: string;
  mailgun_api_key?: string;
  mailgun_domain?: string;
}

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailSender {
  private transporter: Transporter | null = null;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Priority: SendGrid API > Mailgun API > SMTP
    
    if (this.config.sendgrid_api_key) {
      // Use SendGrid via SMTP
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: this.config.sendgrid_api_key
        }
      });
    } else if (this.config.mailgun_api_key && this.config.mailgun_domain) {
      // Use Mailgun via SMTP
      this.transporter = nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: this.config.mailgun_domain,
          pass: this.config.mailgun_api_key
        }
      });
    } else if (this.config.smtp_host) {
      // Use custom SMTP
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp_host,
        port: this.config.smtp_port || 587,
        secure: this.config.smtp_secure || false,
        auth: this.config.smtp_user ? {
          user: this.config.smtp_user,
          pass: this.config.smtp_password
        } : undefined
      });
    } else {
      // Development: Use Ethereal Email (fake SMTP for testing)
      console.warn('No email configuration found. Using Ethereal Email for development.');
      // Will be initialized on first send
    }
  }

  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // If no transporter configured, use Ethereal for development
      if (!this.transporter) {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        console.log('📧 Using Ethereal Email for development. Check: https://ethereal.email');
      }

      const info = await this.transporter.sendMail({
        from: this.config.smtp_user || 'noreply@example.com',
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text || message.html.replace(/<[^>]*>/g, '')
      });

      console.log(`✅ Email sent: ${info.messageId}`);
      console.log(`   Preview: ${nodemailer.getTestMessageUrl(info) || 'N/A'}`);

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error: any) {
      console.error('❌ Failed to send email:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }
      await this.transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }
}

