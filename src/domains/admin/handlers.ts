import { Context } from "hono";
import { AuthService } from "../auth/services.js";
import { RBACService } from "../../shared/rbac/rbac-service.js";
import { OrganizationService } from "../../shared/organization/organization-service.js";
import { AuditService } from "../../shared/audit/audit-service.js";
import { Logger } from "../../shared/utils/logger.js";
import { insertOrganizationSchema, insertOrganizationMemberSchema, users, organizationMembers, organizations } from "../../shared/database/schema.js";
import { z } from "zod";
import { db } from "../../config/database.js";
import { eq, and, sql, desc, asc } from "drizzle-orm";

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).max(255).optional(),
  organizationId: z.string().uuid().optional(),
  roles: z.array(z.string().uuid()).optional(),
  sendInvite: z.boolean().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(255).optional(),
  emailVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const listUsersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  organizationId: z.string().uuid().optional(),
  role: z.string().optional(),
  email: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['created_at', 'email', 'name']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
});

export class AdminHandlers {
  /**
   * Create a new user (admin only)
   */
  static async createUser(c: Context) {
    try {
      const adminUser = c.get("user");
      const body = await c.req.json();
      const { email, password, name, organizationId, roles, sendInvite } = createUserSchema.parse(body);

      // Check permissions
      const canCreateUser = await RBACService.hasPermission(adminUser.id, RBACService.PERMISSIONS.CREATE_USER);
      if (!canCreateUser) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot create users",
          }
        }, 403);
      }

      // Check if organization exists if specified
      if (organizationId) {
        const organization = await OrganizationService.getOrganizationById(organizationId);
        if (!organization) {
          return c.json({
            success: false,
            error: {
              code: "ORGANIZATION_NOT_FOUND",
              message: "Organization not found",
            }
          }, 404);
        }

        // Check if admin has permission to manage this organization
        const canManageOrg = await RBACService.hasOrgPermission(
          adminUser.id,
          RBACService.PERMISSIONS.MANAGE_ORG_MEMBERS,
          organizationId
        );
        if (!canManageOrg) {
          return c.json({
            success: false,
            error: {
              code: "INSUFFICIENT_ORG_PERMISSIONS",
              message: "Cannot create users in this organization",
            }
          }, 403);
        }
      }

      // Generate temp password if not provided
      const userPassword = password || AuthService.generateTempPassword();
      const hashedPassword = await AuthService.hashPassword(userPassword);

      // Create user
      const user = await AuthService.createUser(email, userPassword, name);

      // Assign roles
      if (roles && roles.length > 0) {
        for (const roleId of roles) {
          await RBACService.assignRoleToUser(user.id, roleId, adminUser.id);
        }
      } else {
        // Assign default user role
        await RBACService.assignDefaultRoleToUser(user.id);
      }

      // Add to organization if specified
      if (organizationId) {
        const userRole = roles && roles.length > 0 ? roles[0] : undefined;
        await OrganizationService.addUserToOrganization(organizationId, user.id, userRole, adminUser.id);
      }

      // Send invitation email if requested
      if (sendInvite && !password) {
        // TODO: Implement invitation email sending
        Logger.info("Invitation email would be sent to", { email });
      }

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "user_created",
        resource: "user",
        resourceId: user.id,
        details: JSON.stringify({
          createdBy: adminUser.id,
          organizationId,
          roles,
          sendInvite,
        }),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
        organizationId,
      });

      return c.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
          },
          tempPassword: password ? undefined : userPassword,
          invitationSent: sendInvite && !password,
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

      Logger.error("Failed to create user", { error });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Get user details
   */
  static async getUser(c: Context) {
    try {
      const adminUser = c.get("user");
      const userId = c.req.param("id");

      // Check permissions
      const canReadUser = await RBACService.hasPermission(adminUser.id, RBACService.PERMISSIONS.READ_USER);
      if (!canReadUser) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot view users",
          }
        }, 403);
      }

      // Get user details with roles and organizations
      const user = await AuthService.getUserById(userId);
      if (!user) {
        return c.json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          }
        }, 404);
      }

      // Get user roles
      const userRoles = await RBACService.getUserRoles(userId);

      // Get user organizations
      const organizations = await OrganizationService.getUserOrganizations(userId);

      return c.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          roles: userRoles,
          organizations: organizations.map(org => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: org.role?.name,
            joinedAt: org.membership?.joinedAt,
          })),
        }
      });

    } catch (error) {
      Logger.error("Failed to get user", { error, userId: c.req.param("id") });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * List users with pagination and filtering
   */
  static async listUsers(c: Context) {
    try {
      const adminUser = c.get("user");
      const query = c.req.query();
      const { page, limit, organizationId, role, email, isActive, sortBy, sortOrder } = listUsersSchema.parse(query);

      // Check permissions
      let canListUsers = await RBACService.hasPermission(adminUser.id, RBACService.PERMISSIONS.READ_USER);

      // If organization-specific, check org permissions
      if (organizationId) {
        canListUsers = canListUsers || await RBACService.hasOrgPermission(
          adminUser.id,
          RBACService.PERMISSIONS.READ_USER,
          organizationId
        );
      }

      if (!canListUsers) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot list users",
          }
        }, 403);
      }

      const result = await AdminHandlers.listUsersWithPagination({
        page,
        limit,
        organizationId,
        role,
        email,
        isActive,
        sortBy,
        sortOrder,
      });

      return c.json({
        success: true,
        data: result
      });

    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: error.message,
          }
        }, 400);
      }

      Logger.error("Failed to list users", { error });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Internal method for listing users with pagination
   */
  static async listUsersWithPagination({
    page,
    limit,
    organizationId,
    role,
    email,
    isActive,
    sortBy,
    sortOrder,
  }: {
    page: number;
    limit: number;
    organizationId?: string;
    role?: string;
    email?: string;
    isActive?: boolean;
    sortBy: string;
    sortOrder: string;
  }) {
    const offset = (page - 1) * limit;

    // Build the base query
    let query = db
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
      .$dynamic();

    // Apply filters
    const conditions = [];

    if (email) {
      conditions.push(sql`LOWER(${users.email}) LIKE LOWER(${`%${email}%`})`);
    }

    if (organizationId) {
      // Join with organization_members to filter by organization
      query = query
        .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
        .where(and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.isActive, true),
          ...conditions
        ));
    } else {
      // Apply conditions directly if no organization filter
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }

    // Apply sorting
    const sortColumn = sortBy === 'email' ? users.email :
                      sortBy === 'name' ? users.name :
                      users.createdAt;

    query = sortOrder === 'desc'
      ? query.orderBy(desc(sortColumn))
      : query.orderBy(asc(sortColumn));

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .$dynamic();

    if (organizationId) {
      countQuery
        .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
        .where(and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.isActive, true),
          ...conditions
        ));
    } else if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [countResult] = await countQuery;
    const total = countResult.count;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination and execute query
    const usersList = await query.limit(limit).offset(offset);

    // Get roles and organizations for each user
    const usersWithDetails = await Promise.all(
      usersList.map(async (user) => {
        const roles = await RBACService.getUserRoles(user.id);
        const organizations = await OrganizationService.getUserOrganizations(user.id);

        return {
          ...user,
          roles: roles.map(r => r), // Convert to array of role names
          organizations: organizations.map(org => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: org.role?.name,
            joinedAt: org.membership?.joinedAt,
          })),
        };
      })
    );

    // Apply role filter if specified (client-side filtering for simplicity)
    let filteredUsers = usersWithDetails;
    if (role) {
      filteredUsers = usersWithDetails.filter(user =>
        user.roles.includes(role as any)
      );
    }

    return {
      users: filteredUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    };
  }

  /**
   * Update user
   */
  static async updateUser(c: Context) {
    try {
      const adminUser = c.get("user");
      const userId = c.req.param("id");
      const body = await c.req.json();
      const updates = updateUserSchema.parse(body);

      // Check permissions
      const canUpdateUser = await RBACService.hasPermission(adminUser.id, RBACService.PERMISSIONS.UPDATE_USER);
      if (!canUpdateUser) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot update users",
          }
        }, 403);
      }

      // Update user
      const updatedUser = await AuthService.updateUser(userId, updates);

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "user_updated",
        resource: "user",
        resourceId: userId,
        details: JSON.stringify(updates),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
      });

      return c.json({
        success: true,
        data: {
          user: updatedUser,
        }
      });

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

      Logger.error("Failed to update user", { error, userId: c.req.param("id") });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(c: Context) {
    try {
      const adminUser = c.get("user");
      const userId = c.req.param("id");

      // Check permissions
      const canDeleteUser = await RBACService.hasPermission(adminUser.id, RBACService.PERMISSIONS.DELETE_USER);
      if (!canDeleteUser) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot delete users",
          }
        }, 403);
      }

      // Soft delete user
      const deletedUser = await AuthService.deleteUser(userId);

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "user_deleted",
        resource: "user",
        resourceId: userId,
        details: JSON.stringify({ softDelete: true }),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
      });

      return c.json({
        success: true,
        data: {
          user: deletedUser,
        }
      });

    } catch (error) {
      Logger.error("Failed to delete user", { error, userId: c.req.param("id") });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Assign role to user
   */
  static async assignUserRole(c: Context) {
    try {
      const adminUser = c.get("user");
      const userId = c.req.param("id");
      const body = await c.req.json();
      const { roleId, organizationId } = z.object({
        roleId: z.string().uuid(),
        organizationId: z.string().uuid().optional(),
      }).parse(body);

      // Check permissions
      let canAssignRoles = await RBACService.hasPermission(adminUser.id, RBACService.PERMISSIONS.ASSIGN_ROLES);

      // If organization-specific, check org permissions
      if (organizationId) {
        canAssignRoles = canAssignRoles || await RBACService.hasOrgPermission(
          adminUser.id,
          RBACService.PERMISSIONS.ASSIGN_ROLES,
          organizationId
        );
      }

      if (!canAssignRoles) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot assign roles",
          }
        }, 403);
      }

      // Assign role
      if (organizationId) {
        // Organization-specific role
        await OrganizationService.updateUserRoleInOrganization(organizationId, userId, roleId);
      } else {
        // Global role
        await RBACService.assignRoleToUser(userId, roleId, adminUser.id);
      }

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "role_assigned",
        resource: "user_role",
        resourceId: `${userId}:${roleId}`,
        details: JSON.stringify({ roleId, organizationId }),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
        organizationId,
      });

      return c.json({
        success: true,
        data: {
          message: "Role assigned successfully",
        }
      });

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

      Logger.error("Failed to assign role", { error, userId: c.req.param("id") });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Remove role from user
   */
  static async removeUserRole(c: Context) {
    try {
      const adminUser = c.get("user");
      const userId = c.req.param("id");
      const roleId = c.req.param("roleId");
      const organizationId = c.req.query("organizationId");

      // Check permissions
      let canAssignRoles = await RBACService.hasPermission(adminUser.id, RBACService.PERMISSIONS.ASSIGN_ROLES);

      // If organization-specific, check org permissions
      if (organizationId) {
        canAssignRoles = canAssignRoles || await RBACService.hasOrgPermission(
          adminUser.id,
          RBACService.PERMISSIONS.ASSIGN_ROLES,
          organizationId
        );
      }

      if (!canAssignRoles) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot manage roles",
          }
        }, 403);
      }

      // Remove role
      if (organizationId) {
        // Organization-specific role removal - remove user from organization
        await OrganizationService.removeUserFromOrganization(organizationId, userId);
      } else {
        // Global role removal
        await RBACService.removeRoleFromUser(userId, roleId);
      }

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "role_removed",
        resource: "user_role",
        resourceId: `${userId}:${roleId}`,
        details: JSON.stringify({ roleId, organizationId }),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
        organizationId,
      });

      return c.json({
        success: true,
        data: {
          message: "Role removed successfully",
        }
      });

    } catch (error) {
      Logger.error("Failed to remove role", { error, userId: c.req.param("id"), roleId: c.req.param("roleId") });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Create organization
   */
  static async createOrganization(c: Context) {
    try {
      const adminUser = c.get("user");
      const body = await c.req.json();
      const { name, slug, description, settings } = insertOrganizationSchema.parse(body);

      // Check permissions
      const canCreateOrg = await RBACService.hasPermission(adminUser.id, RBACService.PERMISSIONS.CREATE_ORGANIZATION);
      if (!canCreateOrg) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot create organizations",
          }
        }, 403);
      }

      // Create organization
      const uniqueSlug = await OrganizationService.ensureUniqueSlug(slug || OrganizationService.generateSlug(name));
      const orgId = await OrganizationService.createOrganization(
        name,
        uniqueSlug,
        adminUser.id,
        description,
        settings ? JSON.parse(settings) : undefined
      );

      if (!orgId) {
        return c.json({
          success: false,
          error: {
            code: "ORGANIZATION_CREATION_FAILED",
            message: "Failed to create organization",
          }
        }, 500);
      }

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "organization_created",
        resource: "organization",
        resourceId: orgId,
        details: JSON.stringify({ name, slug: uniqueSlug, description }),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
      });

      const organization = await OrganizationService.getOrganizationById(orgId);

      return c.json({
        success: true,
        data: {
          organization,
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

      Logger.error("Failed to create organization", { error });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Get organization details
   */
  static async getOrganization(c: Context) {
    try {
      const adminUser = c.get("user");
      const orgId = c.req.param("id");

      // Check permissions
      const canReadOrg = await RBACService.hasOrgPermission(
        adminUser.id,
        RBACService.PERMISSIONS.READ_ORGANIZATION,
        orgId
      );
      if (!canReadOrg) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot view organization",
          }
        }, 403);
      }

      const organization = await OrganizationService.getOrganizationById(orgId);
      if (!organization) {
        return c.json({
          success: false,
          error: {
            code: "ORGANIZATION_NOT_FOUND",
            message: "Organization not found",
          }
        }, 404);
      }

      // Get organization members
      const members = await OrganizationService.getOrganizationMembers(orgId);

      return c.json({
        success: true,
        data: {
          organization,
          members,
          memberCount: members.length,
        }
      });

    } catch (error) {
      Logger.error("Failed to get organization", { error, orgId: c.req.param("id") });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Update organization
   */
  static async updateOrganization(c: Context) {
    try {
      const adminUser = c.get("user");
      const orgId = c.req.param("id");
      const body = await c.req.json();
      const updates = z.object({
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        settings: z.record(z.any()).optional(),
        isActive: z.boolean().optional(),
      }).parse(body);

      // Check permissions
      const canUpdateOrg = await RBACService.hasOrgPermission(
        adminUser.id,
        RBACService.PERMISSIONS.UPDATE_ORGANIZATION,
        orgId
      );
      if (!canUpdateOrg) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot update organization",
          }
        }, 403);
      }

      const success = await OrganizationService.updateOrganization(orgId, updates);

      if (!success) {
        return c.json({
          success: false,
          error: {
            code: "ORGANIZATION_UPDATE_FAILED",
            message: "Failed to update organization",
          }
        }, 500);
      }

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "organization_updated",
        resource: "organization",
        resourceId: orgId,
        details: JSON.stringify(updates),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
        organizationId: orgId,
      });

      const organization = await OrganizationService.getOrganizationById(orgId);

      return c.json({
        success: true,
        data: {
          organization,
        }
      });

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

      Logger.error("Failed to update organization", { error, orgId: c.req.param("id") });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Delete organization
   */
  static async deleteOrganization(c: Context) {
    try {
      const adminUser = c.get("user");
      const orgId = c.req.param("id");

      // Check permissions
      const canDeleteOrg = await RBACService.hasOrgPermission(
        adminUser.id,
        RBACService.PERMISSIONS.DELETE_ORGANIZATION,
        orgId
      );
      if (!canDeleteOrg) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot delete organization",
          }
        }, 403);
      }

      const success = await OrganizationService.deleteOrganization(orgId);

      if (!success) {
        return c.json({
          success: false,
          error: {
            code: "ORGANIZATION_DELETE_FAILED",
            message: "Failed to delete organization",
          }
        }, 500);
      }

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "organization_deleted",
        resource: "organization",
        resourceId: orgId,
        details: JSON.stringify({ softDelete: true }),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
        organizationId: orgId,
      });

      return c.json({
        success: true,
        data: {
          message: "Organization deleted successfully",
        }
      });

    } catch (error) {
      Logger.error("Failed to delete organization", { error, orgId: c.req.param("id") });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Invite user to organization
   */
  static async inviteUserToOrganization(c: Context) {
    try {
      const adminUser = c.get("user");
      const orgId = c.req.param("id");
      const body = await c.req.json();
      const { email, roleId } = inviteUserSchema.parse(body);

      // Check permissions
      const canInvite = await RBACService.hasOrgPermission(
        adminUser.id,
        RBACService.PERMISSIONS.INVITE_ORG_MEMBERS,
        orgId
      );
      if (!canInvite) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot invite users to organization",
          }
        }, 403);
      }

      // Create invitation
      const invitationId = await OrganizationService.createInvitation(
        orgId,
        email,
        roleId || null,
        adminUser.id
      );

      if (!invitationId) {
        return c.json({
          success: false,
          error: {
            code: "INVITATION_FAILED",
            message: "Failed to create invitation",
          }
        }, 500);
      }

      // TODO: Send invitation email
      Logger.info("Invitation created, email would be sent to", { email, orgId });

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "organization_invitation_sent",
        resource: "organization_invitation",
        resourceId: invitationId,
        details: JSON.stringify({ email, roleId }),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
        organizationId: orgId,
      });

      return c.json({
        success: true,
        data: {
          message: "Invitation sent successfully",
          invitationId,
        }
      });

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

      Logger.error("Failed to invite user", { error, orgId: c.req.param("id") });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * List organizations with pagination
   */
  static async listOrganizations(c: Context) {
    try {
      const adminUser = c.get("user");
      const query = c.req.query();
      const page = parseInt(query.page || "1");
      const limit = Math.min(parseInt(query.limit || "20"), 100);
      const search = query.search as string;

      // Check permissions - super admin can see all, regular admins only their own orgs
      const isSuperAdmin = await RBACService.hasGlobalRole(adminUser.id, "super_admin");

      const offset = (page - 1) * limit;

      let queryBuilder = db
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
        .$dynamic();

      // Apply filters
      const conditions = [];

      if (!isSuperAdmin) {
        // Regular admins can only see organizations they own or are members of
        conditions.push(eq(organizations.ownerId, adminUser.id));
      }

      if (search) {
        conditions.push(sql`LOWER(${organizations.name}) LIKE LOWER(${`%${search}%`}) OR LOWER(${organizations.slug}) LIKE LOWER(${`%${search}%`})`);
      }

      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
      }

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(organizations)
        .$dynamic();

      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }

      const [countResult] = await countQuery;
      const total = countResult.count;
      const totalPages = Math.ceil(total / limit);

      // Apply pagination and sorting
      const organizationsList = await queryBuilder
        .orderBy(desc(organizations.createdAt))
        .limit(limit)
        .offset(offset);

      // Parse settings JSON for each organization
      const organizationsWithParsedSettings = organizationsList.map(org => ({
        ...org,
        settings: org.settings ? JSON.parse(org.settings) : {},
      }));

      return c.json({
        success: true,
        data: {
          organizations: organizationsWithParsedSettings,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          }
        }
      });

    } catch (error) {
      Logger.error("Failed to list organizations", { error });
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }
      }, 500);
    }
  }

  /**
   * Remove user from organization
   */
  static async removeUserFromOrganization(c: Context) {
    try {
      const adminUser = c.get("user");
      const orgId = c.req.param("id");
      const userId = c.req.param("userId");

      // Check permissions
      const canManageMembers = await RBACService.hasOrgPermission(
        adminUser.id,
        RBACService.PERMISSIONS.MANAGE_ORG_MEMBERS,
        orgId
      );
      if (!canManageMembers) {
        return c.json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Permission denied: cannot manage organization members",
          }
        }, 403);
      }

      const success = await OrganizationService.removeUserFromOrganization(orgId, userId);

      if (!success) {
        return c.json({
          success: false,
          error: {
            code: "REMOVE_MEMBER_FAILED",
            message: "Failed to remove user from organization",
          }
        }, 500);
      }

      // Audit log
      await AuditService.logEvent({
        userId: adminUser.id,
        action: "organization_member_removed",
        resource: "organization_member",
        resourceId: `${orgId}:${userId}`,
        details: JSON.stringify({ removedUserId: userId }),
        ipAddress: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
        organizationId: orgId,
      });

      return c.json({
        success: true,
        data: {
          message: "User removed from organization successfully",
        }
      });

    } catch (error) {
      Logger.error("Failed to remove user from organization", { error, orgId: c.req.param("id"), userId: c.req.param("userId") });
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
