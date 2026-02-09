import { db } from "../../config/database.js";
import {
  organizations,
  organizationMembers,
  organizationInvitations,
  users,
  roles
} from "../database/schema.js";
import { eq, and, or, sql, desc, asc } from "drizzle-orm";
import { generateRandomString } from "../utils/crypto.js";
import { Logger } from "../utils/logger.js";

export class OrganizationService {
  /**
   * Create a new organization
   */
  static async createOrganization(
    name: string,
    slug: string,
    ownerId: string,
    description?: string,
    settings?: Record<string, any>
  ): Promise<string | null> {
    try {
      // Check if slug is already taken
      const existingOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (existingOrg.length > 0) {
        Logger.warn("Organization slug already exists", { slug });
        return null;
      }

      const settingsJson = settings ? JSON.stringify(settings) : "{}";

      const [org] = await db.insert(organizations).values({
        name,
        slug,
        description,
        ownerId,
        settings: settingsJson,
      }).returning();

      // Add owner as a member with admin role
      const adminRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "admin"))
        .limit(1);

      if (adminRole.length > 0) {
        await db.insert(organizationMembers).values({
          organizationId: org.id,
          userId: ownerId,
          roleId: adminRole[0].id,
          joinedAt: new Date(),
          isActive: true,
        });
      }

      Logger.info("Organization created", { id: org.id, slug, ownerId });
      return org.id;
    } catch (error) {
      Logger.error("Failed to create organization", { error, name, slug, ownerId });
      return null;
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganizationById(id: string): Promise<any | null> {
    try {
      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          ownerId: organizations.ownerId,
          settings: organizations.settings,
          isActive: organizations.isActive,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          owner: {
            id: users.id,
            email: users.email,
            name: users.name,
          },
        })
        .from(organizations)
        .leftJoin(users, eq(organizations.ownerId, users.id))
        .where(eq(organizations.id, id))
        .limit(1);

      if (org && org.settings) {
        org.settings = JSON.parse(org.settings);
      }

      return org || null;
    } catch (error) {
      Logger.error("Failed to get organization", { error, id });
      return null;
    }
  }

  /**
   * Get organization by slug
   */
  static async getOrganizationBySlug(slug: string): Promise<any | null> {
    try {
      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          ownerId: organizations.ownerId,
          settings: organizations.settings,
          isActive: organizations.isActive,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          owner: {
            id: users.id,
            email: users.email,
            name: users.name,
          },
        })
        .from(organizations)
        .leftJoin(users, eq(organizations.ownerId, users.id))
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (org && org.settings) {
        org.settings = JSON.parse(org.settings);
      }

      return org || null;
    } catch (error) {
      Logger.error("Failed to get organization by slug", { error, slug });
      return null;
    }
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    id: string,
    updates: {
      name?: string;
      slug?: string;
      description?: string;
      settings?: Record<string, any>;
      isActive?: boolean;
    }
  ): Promise<boolean> {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.slug) updateData.slug = updates.slug;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.settings) updateData.settings = JSON.stringify(updates.settings);
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const result = await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, id));

      Logger.info("Organization updated", { id, updates });
      return result.length > 0;
    } catch (error) {
      Logger.error("Failed to update organization", { error, id, updates });
      return false;
    }
  }

  /**
   * Delete organization (soft delete by setting isActive = false)
   */
  static async deleteOrganization(id: string): Promise<boolean> {
    try {
      const result = await db
        .update(organizations)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, id));

      Logger.info("Organization deleted", { id });
      return result.length > 0;
    } catch (error) {
      Logger.error("Failed to delete organization", { error, id });
      return false;
    }
  }

  /**
   * Get organizations for a user (where they are owner or member)
   */
  static async getUserOrganizations(userId: string): Promise<any[]> {
    try {
      const orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          ownerId: organizations.ownerId,
          settings: organizations.settings,
          isActive: organizations.isActive,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          role: {
            id: roles.id,
            name: roles.name,
          },
          membership: {
            joinedAt: organizationMembers.joinedAt,
            isActive: organizationMembers.isActive,
          },
        })
        .from(organizations)
        .innerJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
        .leftJoin(roles, eq(organizationMembers.roleId, roles.id))
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.isActive, true),
            eq(organizations.isActive, true)
          )
        )
        .orderBy(desc(organizations.createdAt));

      // Parse settings JSON
      return orgs.map(org => ({
        ...org,
        settings: org.settings ? JSON.parse(org.settings) : {},
      }));
    } catch (error) {
      Logger.error("Failed to get user organizations", { error, userId });
      return [];
    }
  }

  /**
   * Add user to organization
   */
  static async addUserToOrganization(
    organizationId: string,
    userId: string,
    roleId?: string,
    invitedBy?: string
  ): Promise<boolean> {
    try {
      // Check if user is already a member
      const existingMember = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        // Reactivate if inactive
        if (!existingMember[0].isActive) {
          await db
            .update(organizationMembers)
            .set({
              roleId: roleId || existingMember[0].roleId,
              isActive: true,
              joinedAt: new Date(),
            })
            .where(eq(organizationMembers.id, existingMember[0].id));
        }
        return true;
      }

      // Add new member
      await db.insert(organizationMembers).values({
        organizationId,
        userId,
        roleId,
        invitedBy,
        joinedAt: new Date(),
        isActive: true,
      });

      Logger.info("User added to organization", { organizationId, userId, roleId });
      return true;
    } catch (error) {
      Logger.error("Failed to add user to organization", { error, organizationId, userId });
      return false;
    }
  }

  /**
   * Remove user from organization
   */
  static async removeUserFromOrganization(organizationId: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .update(organizationMembers)
        .set({ isActive: false })
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId)
          )
        );

      Logger.info("User removed from organization", { organizationId, userId });
      return result.length > 0;
    } catch (error) {
      Logger.error("Failed to remove user from organization", { error, organizationId, userId });
      return false;
    }
  }

  /**
   * Update user's role in organization
   */
  static async updateUserRoleInOrganization(
    organizationId: string,
    userId: string,
    roleId: string
  ): Promise<boolean> {
    try {
      const result = await db
        .update(organizationMembers)
        .set({ roleId })
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId)
          )
        );

      Logger.info("User role updated in organization", { organizationId, userId, roleId });
      return result.length > 0;
    } catch (error) {
      Logger.error("Failed to update user role in organization", { error, organizationId, userId, roleId });
      return false;
    }
  }

  /**
   * Get organization members
   */
  static async getOrganizationMembers(organizationId: string): Promise<any[]> {
    try {
      const members = await db
        .select({
          id: organizationMembers.id,
          userId: organizationMembers.userId,
          roleId: organizationMembers.roleId,
          invitedBy: organizationMembers.invitedBy,
          invitedAt: organizationMembers.invitedAt,
          joinedAt: organizationMembers.joinedAt,
          isActive: organizationMembers.isActive,
          user: {
            id: users.id,
            email: users.email,
            name: users.name,
            emailVerified: users.emailVerified,
          },
          role: {
            id: roles.id,
            name: roles.name,
            description: roles.description,
          },
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .leftJoin(roles, eq(organizationMembers.roleId, roles.id))
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.isActive, true)
          )
        )
        .orderBy(desc(organizationMembers.joinedAt));

      return members;
    } catch (error) {
      Logger.error("Failed to get organization members", { error, organizationId });
      return [];
    }
  }

  /**
   * Check if user is member of organization
   */
  static async isUserInOrganization(organizationId: string, userId: string): Promise<boolean> {
    try {
      const [member] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.isActive, true)
          )
        )
        .limit(1);

      return !!member;
    } catch (error) {
      Logger.error("Failed to check user membership", { error, organizationId, userId });
      return false;
    }
  }

  /**
   * Check if user has role in organization
   */
  static async userHasRoleInOrganization(
    organizationId: string,
    userId: string,
    roleName: string
  ): Promise<boolean> {
    try {
      const [member] = await db
        .select({
          roleName: roles.name,
        })
        .from(organizationMembers)
        .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.isActive, true),
            eq(roles.name, roleName)
          )
        )
        .limit(1);

      return !!member;
    } catch (error) {
      Logger.error("Failed to check user role in organization", { error, organizationId, userId, roleName });
      return false;
    }
  }

  /**
   * Create invitation for user to join organization
   */
  static async createInvitation(
    organizationId: string,
    email: string,
    roleId: string | null,
    invitedBy: string,
    expiresInDays: number = 7
  ): Promise<string | null> {
    try {
      const token = generateRandomString(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const [invitation] = await db.insert(organizationInvitations).values({
        organizationId,
        email,
        roleId,
        invitedBy,
        token,
        expiresAt,
      }).returning();

      Logger.info("Organization invitation created", { id: invitation.id, organizationId, email });
      return invitation.id;
    } catch (error) {
      Logger.error("Failed to create invitation", { error, organizationId, email });
      return null;
    }
  }

  /**
   * Accept invitation
   */
  static async acceptInvitation(token: string, userId: string): Promise<boolean> {
    try {
      // Find invitation
      const [invitation] = await db
        .select()
        .from(organizationInvitations)
        .where(
          and(
            eq(organizationInvitations.token, token),
            sql`${organizationInvitations.expiresAt} > NOW()`,
            sql`${organizationInvitations.acceptedAt} IS NULL`
          )
        )
        .limit(1);

      if (!invitation) {
        return false;
      }

      // Mark invitation as accepted
      await db
        .update(organizationInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(organizationInvitations.id, invitation.id));

      // Add user to organization
      await this.addUserToOrganization(
        invitation.organizationId,
        userId,
        invitation.roleId || undefined,
        invitation.invitedBy
      );

      Logger.info("Organization invitation accepted", { token, userId, organizationId: invitation.organizationId });
      return true;
    } catch (error) {
      Logger.error("Failed to accept invitation", { error, token, userId });
      return false;
    }
  }

  /**
   * Generate unique slug from name
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Ensure slug is unique by appending number if needed
   */
  static async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (existing.length === 0) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}
