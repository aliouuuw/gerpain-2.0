import { db } from "../../config/database.js";
import { auditLogs } from "../database/schema.js";
import { Context } from "hono";

export interface AuditEvent {
  userId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  static async logEvent(event: AuditEvent): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: event.userId,
        organizationId: event.organizationId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        details: event.details,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
      // Don't throw - audit logging failures shouldn't break the main flow
    }
  }

  static extractClientInfo(c: Context): { ipAddress?: string; userAgent?: string } {
    const ipAddress = c.req.header("CF-Connecting-IP") || // Cloudflare
                     c.req.header("X-Forwarded-For") || // Generic proxy
                     c.req.header("X-Real-IP") || // Nginx
                     "unknown";

    const userAgent = c.req.header("User-Agent");

    return {
      ipAddress: ipAddress === "unknown" ? undefined : ipAddress,
      userAgent,
    };
  }

  // Convenience methods for common auth events
  static async logLogin(c: Context, userId: string, success: boolean): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      userId,
      action: success ? "login_success" : "login_failed",
      resource: "user",
      resourceId: userId,
      details: success ? "User logged in successfully" : "Login attempt failed",
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  static async logLogout(c: Context, userId: string): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      userId,
      action: "logout",
      resource: "user",
      resourceId: userId,
      details: "User logged out",
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  static async logSignup(c: Context, userId: string, email: string): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      userId,
      action: "signup",
      resource: "user",
      resourceId: userId,
      details: `New user account created: ${email}`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  static async logPasswordResetRequest(c: Context, email: string): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      action: "password_reset_request",
      resource: "user",
      details: `Password reset requested for: ${email}`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  static async logPasswordReset(c: Context, userId: string): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      userId,
      action: "password_reset",
      resource: "user",
      resourceId: userId,
      details: "Password reset completed",
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  static async logEmailVerification(c: Context, userId: string): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      userId,
      action: "email_verification",
      resource: "user",
      resourceId: userId,
      details: "Email verified successfully",
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  static async logApiKeyCreation(c: Context, userId: string, apiKeyId: string, name: string): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      userId,
      action: "api_key_created",
      resource: "api_key",
      resourceId: apiKeyId,
      details: `API key created: ${name}`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  static async logApiKeyRevocation(c: Context, userId: string, apiKeyId: string): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      userId,
      action: "api_key_revoked",
      resource: "api_key",
      resourceId: apiKeyId,
      details: "API key revoked",
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  static async logRoleAssignment(c: Context, assignedBy: string, userId: string, roleName: string): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      userId: assignedBy,
      action: "role_assigned",
      resource: "user_role",
      resourceId: userId,
      details: `Role '${roleName}' assigned to user`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  static async logRoleRemoval(c: Context, removedBy: string, userId: string, roleName: string): Promise<void> {
    const clientInfo = this.extractClientInfo(c);
    await this.logEvent({
      userId: removedBy,
      action: "role_removed",
      resource: "user_role",
      resourceId: userId,
      details: `Role '${roleName}' removed from user`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }
}

