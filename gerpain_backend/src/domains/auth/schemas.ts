import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, "API key name is required").max(255),
});

export const revokeApiKeySchema = z.object({
  keyId: z.string().uuid("Invalid key ID"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  email: z.string().email("Invalid email address").optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignUpRequest = z.infer<typeof signUpSchema>;
export type SignInRequest = z.infer<typeof signInSchema>;
export type CreateApiKeyRequest = z.infer<typeof createApiKeySchema>;
export type RevokeApiKeyRequest = z.infer<typeof revokeApiKeySchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationSchema>;
export type RequestPasswordResetRequest = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;


