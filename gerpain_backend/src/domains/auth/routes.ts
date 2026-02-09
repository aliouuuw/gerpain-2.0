import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { AuthHandlers } from "./handlers.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAdmin } from "../../middleware/rbac.js";
import { z } from "zod";
import { signInSchema, signUpSchema, verifyEmailSchema, resendVerificationSchema, requestPasswordResetSchema, resetPasswordSchema } from "./schemas.js";
import { ErrorResponse, UserSummary, MessageResponse, Success } from "../../shared/utils/openapi-schemas.js";

const auth = new OpenAPIHono();

// Full user schema for profile endpoints
const UserFull = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  emailVerified: z.boolean().nullable(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

// Apply auth middleware to protected paths
auth.use("/profile", requireAuth);
auth.use("/change-password", requireAuth);
auth.use("/api-keys", requireAuth);

// Public routes with OpenAPI
auth.openapi(
  createRoute({
    method: "post",
    path: "/signup",
    tags: ["Auth"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: signUpSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "User created",
        content: {
          "application/json": {
            schema: Success(z.object({ user: UserSummary, sessionId: z.string() })),
          },
        },
      },
      400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "User already exists", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.signUp
);

auth.openapi(
  createRoute({
    method: "post",
    path: "/signin",
    tags: ["Auth"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: signInSchema,
          },
        },
      },
    },
    responses: {
      200: { description: "Signed in", content: { "application/json": { schema: Success(z.object({ user: UserSummary, sessionId: z.string() })) } } },
      400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
      401: { description: "Invalid credentials", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.signIn
);

// Non-annotated public route (kept as-is)
auth.post("/signout", AuthHandlers.signOut);

// Email verification routes (annotated)
auth.openapi(
  createRoute({
    method: "post",
    path: "/verify-email",
    tags: ["Auth"],
    request: { body: { content: { "application/json": { schema: verifyEmailSchema } } } },
    responses: {
      200: { description: "Email verified", content: { "application/json": { schema: Success(z.object({ message: z.string(), user: UserSummary })) } } },
      400: { description: "Verification failed", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.verifyEmail
);

auth.openapi(
  createRoute({
    method: "post",
    path: "/resend-verification",
    tags: ["Auth"],
    request: { body: { content: { "application/json": { schema: resendVerificationSchema } } } },
    responses: {
      200: { description: "Resent verification", content: { "application/json": { schema: MessageResponse } } },
      400: { description: "Failed to resend", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.resendVerificationEmail
);

// Password reset routes (annotated)
auth.openapi(
  createRoute({
    method: "post",
    path: "/request-password-reset",
    tags: ["Auth"],
    request: { body: { content: { "application/json": { schema: requestPasswordResetSchema } } } },
    responses: {
      200: { description: "Request accepted", content: { "application/json": { schema: MessageResponse } } },
      400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.requestPasswordReset
);

auth.openapi(
  createRoute({
    method: "post",
    path: "/reset-password",
    tags: ["Auth"],
    request: { body: { content: { "application/json": { schema: resetPasswordSchema } } } },
    responses: {
      200: { description: "Password reset", content: { "application/json": { schema: MessageResponse } } },
      400: { description: "Reset failed", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.resetPassword
);

// Email verification routes (public)
auth.post("/verify-email", AuthHandlers.verifyEmail);
auth.post("/resend-verification", AuthHandlers.resendVerificationEmail);

// Password reset routes (public)
auth.post("/request-password-reset", AuthHandlers.requestPasswordReset);
auth.post("/reset-password", AuthHandlers.resetPassword);

// Protected routes
auth.use("/organizations", requireAuth);

auth.get("/organizations", AuthHandlers.getUserOrganizations);

auth.openapi(
  createRoute({
    method: "get",
    path: "/profile",
    tags: ["Auth"],
    security: [{ SessionCookie: [] } as any],
    responses: {
      200: { description: "Profile", content: { "application/json": { schema: Success(z.object({ user: UserFull.nullable() })) } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.getProfile
);
auth.openapi(
  createRoute({
    method: "put",
    path: "/profile",
    tags: ["Auth"],
    security: [{ SessionCookie: [] } as any],
    request: {
      body: { content: { "application/json": { schema: z.object({ name: z.string().min(1).max(255).optional(), email: z.string().email().optional() }) } } },
    },
    responses: {
      200: { description: "Profile updated", content: { "application/json": { schema: Success(z.object({ message: z.string(), user: UserFull.nullable() })) } } },
      400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.updateProfile
);

auth.openapi(
  createRoute({
    method: "put",
    path: "/change-password",
    tags: ["Auth"],
    security: [{ SessionCookie: [] } as any],
    request: { body: { content: { "application/json": { schema: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }) } } } },
    responses: {
      200: { description: "Password changed", content: { "application/json": { schema: Success(z.object({ message: z.string() })) } } },
      400: { description: "Validation or change failed", content: { "application/json": { schema: ErrorResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.changePassword
);

// API key routes
auth.openapi(
  createRoute({
    method: "post",
    path: "/api-keys",
    tags: ["Auth"],
    security: [{ SessionCookie: [] } as any],
    request: { body: { content: { "application/json": { schema: z.object({ name: z.string().min(1).max(255) }) } } } },
    responses: {
      201: { description: "API key created", content: { "application/json": { schema: Success(z.object({ id: z.string().uuid(), name: z.string(), key: z.string(), createdAt: z.any() })) } } },
      400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.createApiKey
);

auth.openapi(
  createRoute({
    method: "delete",
    path: "/api-keys",
    tags: ["Auth"],
    security: [{ SessionCookie: [] } as any],
    request: { body: { content: { "application/json": { schema: z.object({ keyId: z.string().uuid() }) } } } },
    responses: {
      200: { description: "API key revoked", content: { "application/json": { schema: Success(z.object({ message: z.string() })) } } },
      400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
      500: { description: "Internal error", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  AuthHandlers.revokeApiKey
);

// Admin-only routes (example - extend as needed)
auth.get("/admin/users", requireAdmin, async (c) => {
  // This would be implemented to list users for admin
  return c.json({ success: true, data: { message: "Admin users endpoint" } });
});

export { auth };


