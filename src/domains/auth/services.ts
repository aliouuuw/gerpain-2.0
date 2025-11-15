import { lucia } from "../../config/auth.js";
import { db } from "../../config/database.js";
import { users, oauthAccounts, apiKeys } from "../../shared/database/schema.js";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateApiKey, generateRandomString } from "../../shared/utils/crypto.js";
import { emailService } from "../../shared/email/email-service.js";
import { RBACService } from "../../shared/rbac/rbac-service.js";

export class AuthService {
  static async createUser(email: string, password: string, name?: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = generateRandomString(32);
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const [user] = await db.insert(users).values({
      email,
      hashedPassword,
      name,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpiresAt,
    }).returning();

    // Assign default "user" role
    await RBACService.assignDefaultRoleToUser(user.id);

    // Send verification email
    await emailService.sendVerificationEmail(email, emailVerificationToken);

    return user;
  }

  static async validatePassword(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !user.hashedPassword) {
      return null;
    }

    const validPassword = await bcrypt.compare(password, user.hashedPassword);

    if (validPassword) {
      // Update last login time
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
    }

    return validPassword ? user : null;
  }

  static async createSession(userId: string) {
    return await lucia.createSession(userId, {});
  }

  static async invalidateSession(sessionId: string) {
    return await lucia.invalidateSession(sessionId);
  }

  static async validateSession(sessionId: string) {
    return await lucia.validateSession(sessionId);
  }

  static async createOAuthAccount(userId: string, provider: string, providerUserId: string) {
    const [account] = await db.insert(oauthAccounts).values({
      userId,
      provider,
      providerUserId,
    }).returning();

    return account;
  }

  static async findUserByOAuth(provider: string, providerUserId: string) {
    const [account] = await db.select({
      user: users,
    })
    .from(oauthAccounts)
    .innerJoin(users, eq(oauthAccounts.userId, users.id))
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerUserId, providerUserId)
      )
    )
    .limit(1);

    return account?.user || null;
  }

  static async createApiKey(userId: string, name: string) {
    const key = generateApiKey();
    
    const [apiKey] = await db.insert(apiKeys).values({
      userId,
      name,
      key,
    }).returning();

    return { ...apiKey, key }; // Return the plain key only once
  }

  static async validateApiKey(key: string) {
    const [apiKey] = await db.select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      name: apiKeys.name,
      key: apiKeys.key,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
      user: users,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.key, key))
    .limit(1);

    if (apiKey) {
      // Update last used timestamp
      await db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, apiKey.id));
    }

    return apiKey;
  }

  static async revokeApiKey(keyId: string, userId: string) {
    await db.delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
  }

  // Email verification methods
  static async verifyEmail(token: string): Promise<{ success: boolean; user?: any; error?: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);

    if (!user) {
      return { success: false, error: "Invalid verification token" };
    }

    if (user.emailVerified) {
      return { success: false, error: "Email already verified" };
    }

    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      return { success: false, error: "Verification token expired" };
    }

    // Mark email as verified
    await db.update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    return { success: true, user };
  }

  static async resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.emailVerified) {
      return { success: false, error: "Email already verified" };
    }

    const emailVerificationToken = generateRandomString(32);
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.update(users)
      .set({
        emailVerificationToken,
        emailVerificationExpiresAt,
      })
      .where(eq(users.id, user.id));

    const emailSent = await emailService.sendVerificationEmail(email, emailVerificationToken);

    if (!emailSent) {
      return { success: false, error: "Failed to send verification email" };
    }

    return { success: true };
  }

  // Password reset methods
  static async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      // Don't reveal if email exists or not for security
      return { success: true };
    }

    const passwordResetToken = generateRandomString(32);
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.update(users)
      .set({
        passwordResetToken,
        passwordResetExpiresAt,
      })
      .where(eq(users.id, user.id));

    const emailSent = await emailService.sendPasswordResetEmail(email, passwordResetToken);

    if (!emailSent) {
      return { success: false, error: "Failed to send password reset email" };
    }

    return { success: true };
  }

  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; user?: any; error?: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    if (!user) {
      return { success: false, error: "Invalid reset token" };
    }

    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
      return { success: false, error: "Reset token expired" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.update(users)
      .set({
        hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    return { success: true, user };
  }

  // Profile update methods
  static async updateProfile(userId: string, updates: { name?: string; email?: string }): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const updateData: any = { updatedAt: new Date() };

      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }

      if (updates.email !== undefined) {
        // Check if email is already taken
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, updates.email))
          .limit(1);

        if (existingUser && existingUser.id !== userId) {
          return { success: false, error: "Email already in use" };
        }

        updateData.email = updates.email;
        updateData.emailVerified = false; // Require re-verification for email changes
        updateData.emailVerificationToken = generateRandomString(32);
        updateData.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Send new verification email
        await emailService.sendVerificationEmail(updates.email, updateData.emailVerificationToken);
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: "Failed to update profile" };
    }
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || !user.hashedPassword) {
      return { success: false, error: "User not found" };
    }

    const validPassword = await bcrypt.compare(currentPassword, user.hashedPassword);

    if (!validPassword) {
      return { success: false, error: "Current password is incorrect" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.update(users)
      .set({
        hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  }

  static async getUserWithRoles(userId: string) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    const roles = await RBACService.getUserRoles(userId);
    const permissions = await RBACService.getUserPermissions(userId);

    return {
      ...user,
      roles,
      permissions,
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, updates: {
    email?: string;
    name?: string;
    emailVerified?: boolean;
    isActive?: boolean;
  }) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.emailVerified !== undefined) updateData.emailVerified = updates.emailVerified;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  /**
   * Delete user (soft delete - mark as inactive)
   */
  static async deleteUser(userId: string) {
    const [deletedUser] = await db
      .update(users)
      .set({
        emailVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return deletedUser;
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Generate temporary password
   */
  static generateTempPassword(): string {
    return generateRandomString(12);
  }
}


