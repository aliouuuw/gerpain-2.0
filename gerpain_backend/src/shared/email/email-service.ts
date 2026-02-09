import nodemailer from "nodemailer";
import { env } from "../../config/environment.js";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private initTransporter() {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
      console.warn("SMTP configuration missing, email service disabled");
      return null;
    }

    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  private getTransporter() {
    if (!this.transporter) {
      this.transporter = this.initTransporter();
    }
    return this.transporter;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn("Email service not configured, skipping email send");
      return false;
    }

    try {
      const mailOptions = {
        from: `"Your App" <${env.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Your App!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Verify Email</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: "Verify your email address",
      html,
      text: `Please verify your email by visiting: ${verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: "Reset your password",
      html,
      text: `Reset your password by visiting: ${resetUrl}`,
    });
  }
}

export const emailService = new EmailService();
