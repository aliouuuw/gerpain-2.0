import { Context } from "hono";
import { AuthService } from "./services.js";
import { signUpSchema, signInSchema, createApiKeySchema, revokeApiKeySchema, verifyEmailSchema, resendVerificationSchema, requestPasswordResetSchema, resetPasswordSchema, updateProfileSchema, changePasswordSchema } from "./schemas.js";
import { lucia } from "../../config/auth.js";
import { AuditService } from "../../shared/audit/audit-service.js";

export class AuthHandlers {
  static async signUp(c: Context) {
    try {
      const body = await c.req.json();
      const { email, password, name } = signUpSchema.parse(body);

      // Check if user already exists
      const existingUser = await AuthService.validatePassword(email, "dummy");
      if (existingUser !== null) {
        await AuditService.logEvent({
          action: "signup_failed",
          resource: "user",
          details: "User already exists with this email",
          ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
          userAgent: c.req.header("User-Agent"),
        });

        return c.json({
          success: false,
          error: {
            code: "USER_EXISTS",
            message: "A user with this email already exists",
          }
        }, 409);
      }

      const user = await AuthService.createUser(email, password, name);
      const session = await AuthService.createSession(user.id);

      const sessionCookie = lucia.createSessionCookie(session.id);
      c.header("Set-Cookie", sessionCookie.serialize());

      // Audit log successful signup
      await AuditService.logSignup(c, user.id, email);

      return c.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: !!user.emailVerified,
          },
          sessionId: session.id,
        }
      }, 201);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  static async signIn(c: Context) {
    try {
      const body = await c.req.json();
      const { email, password } = signInSchema.parse(body);

      const user = await AuthService.validatePassword(email, password);
      if (!user) {
        await AuditService.logLogin(c, "", false); // Empty userId for failed login
        return c.json({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          }
        }, 401);
      }

      const session = await AuthService.createSession(user.id);
      const sessionCookie = lucia.createSessionCookie(session.id);
      c.header("Set-Cookie", sessionCookie.serialize());

      // Audit log successful login
      await AuditService.logLogin(c, user.id, true);

      return c.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: !!user.emailVerified,
          },
          sessionId: session.id,
        }
      }, 200);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  static async signOut(c: Context) {
    try {
      const user = c.get("user");
      const sessionId = c.get("sessionId");

      if (sessionId) {
        await AuthService.invalidateSession(sessionId);
      }

      const sessionCookie = lucia.createBlankSessionCookie();
      c.header("Set-Cookie", sessionCookie.serialize());

      // Audit log logout
      if (user) {
        await AuditService.logLogout(c, user.id);
      }

      return c.json({
        success: true,
        data: { message: "Signed out successfully" }
      });
    } catch (error) {
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  static async getProfile(c: Context) {
    const user = c.get("user");

    const userWithRoles = await AuthService.getUserWithRoles(user.id);

    return c.json({
      success: true,
      data: {
        user: userWithRoles,
      }
    }, 200);
  }

  static async getUserOrganizations(c: Context) {
    const user = c.get("user");
    const { OrganizationService } = await import("../../shared/organization/organization-service.js");
    const orgs = await OrganizationService.getUserOrganizations(user.id);
    return c.json({ success: true, data: orgs });
  }

  static async createApiKey(c: Context) {
    try {
      const body = await c.req.json();
      const { name } = createApiKeySchema.parse(body);
      const user = c.get("user");

      const apiKey = await AuthService.createApiKey(user.id, name);

      // Audit log API key creation
      await AuditService.logApiKeyCreation(c, user.id, apiKey.id, name);

      return c.json({
        success: true,
        data: {
          id: apiKey.id,
          name: apiKey.name,
          key: apiKey.key, // Only returned once
          createdAt: apiKey.createdAt,
        }
      }, 201);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  static async revokeApiKey(c: Context) {
    try {
      const body = await c.req.json();
      const { keyId } = revokeApiKeySchema.parse(body);
      const user = c.get("user");

      await AuthService.revokeApiKey(keyId, user.id);

      // Audit log API key revocation
      await AuditService.logApiKeyRevocation(c, user.id, keyId);

      return c.json({
        success: true,
        data: { message: "API key revoked successfully" }
      }, 200);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  // Email verification handlers
  static async verifyEmail(c: Context) {
    try {
      const body = await c.req.json();
      const { token } = verifyEmailSchema.parse(body);

      const result = await AuthService.verifyEmail(token);

      if (!result.success) {
        return c.json({
          success: false,
          error: {
            code: "VERIFICATION_FAILED",
            message: result.error || "Verification failed",
          }
        }, 400);
      }

      // Audit log email verification
      await AuditService.logEmailVerification(c, result.user!.id);

      return c.json({
        success: true,
        data: {
          message: "Email verified successfully",
          user: {
            id: result.user!.id,
            email: result.user!.email,
            emailVerified: true,
          }
        }
      }, 200);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  static async resendVerificationEmail(c: Context) {
    try {
      const body = await c.req.json();
      const { email } = resendVerificationSchema.parse(body);

      const result = await AuthService.resendVerificationEmail(email);

      if (!result.success) {
        return c.json({
          success: false,
          error: {
            code: "RESEND_FAILED",
            message: result.error || "Resend failed",
          }
        }, 400);
      }

      return c.json({
        success: true,
        data: { message: "Verification email sent successfully" }
      }, 200);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  // Password reset handlers
  static async requestPasswordReset(c: Context) {
    try {
      const body = await c.req.json();
      const { email } = requestPasswordResetSchema.parse(body);

      const result = await AuthService.requestPasswordReset(email);

      // Always return success for security (don't reveal if email exists)
      if (result.success) {
        await AuditService.logPasswordResetRequest(c, email);
      }

      return c.json({
        success: true,
        data: { message: "If an account with that email exists, a password reset link has been sent." }
      }, 200);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  static async resetPassword(c: Context) {
    try {
      const body = await c.req.json();
      const { token, newPassword } = resetPasswordSchema.parse(body);

      const result = await AuthService.resetPassword(token, newPassword);

      if (!result.success) {
        return c.json({
          success: false,
          error: {
            code: "RESET_FAILED",
            message: result.error || "Reset failed",
          }
        }, 400);
      }

      // Audit log password reset
      await AuditService.logPasswordReset(c, result.user!.id);

      return c.json({
        success: true,
        data: { message: "Password reset successfully" }
      }, 200);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  // Profile update handlers
  static async updateProfile(c: Context) {
    try {
      const body = await c.req.json();
      const updates = updateProfileSchema.parse(body);
      const user = c.get("user");

      const result = await AuthService.updateProfile(user.id, updates);

      if (!result.success) {
        return c.json({
          success: false,
          error: {
            code: "UPDATE_FAILED",
            message: result.error,
          }
        }, 400);
      }

      return c.json({
        success: true,
        data: {
          message: "Profile updated successfully",
          user: await AuthService.getUserWithRoles(user.id),
        }
      }, 200);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  static async changePassword(c: Context) {
    try {
      const body = await c.req.json();
      const { currentPassword, newPassword } = changePasswordSchema.parse(body);
      const user = c.get("user");

      const result = await AuthService.changePassword(user.id, currentPassword, newPassword);

      if (!result.success) {
        return c.json({
          success: false,
          error: {
            code: "PASSWORD_CHANGE_FAILED",
            message: result.error,
          }
        }, 400);
      }

      return c.json({
        success: true,
        data: { message: "Password changed successfully" }
      }, 200);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.message,
          }
        }, 400);
      }

      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }
}


