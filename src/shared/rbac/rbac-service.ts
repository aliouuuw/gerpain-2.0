import { db } from "../../config/database.js";
import { roles, userRoles, users, organizationMembers } from "../database/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import { OrganizationService } from "../organization/organization-service.js";

export type Permission = string;
export type RoleName = "super_admin" | "admin" | "org_admin" | "moderator" | "user";

export class RBACService {
  // Predefined permissions
  static readonly PERMISSIONS = {
    // User management
    CREATE_USER: "create_user",
    READ_USER: "read_user",
    UPDATE_USER: "update_user",
    DELETE_USER: "delete_user",

    // Organization management
    CREATE_ORGANIZATION: "create_organization",
    READ_ORGANIZATION: "read_organization",
    UPDATE_ORGANIZATION: "update_organization",
    DELETE_ORGANIZATION: "delete_organization",
    MANAGE_ORG_MEMBERS: "manage_org_members",
    INVITE_ORG_MEMBERS: "invite_org_members",

    // Cross-organization permissions (super admin only)
    MANAGE_ALL_ORGANIZATIONS: "manage_all_organizations",
    MANAGE_ALL_USERS: "manage_all_users",

    // Role management
    MANAGE_ROLES: "manage_roles",
    ASSIGN_ROLES: "assign_roles",

    // API key management
    MANAGE_API_KEYS: "manage_api_keys",

    // System
    VIEW_AUDIT_LOGS: "view_audit_logs",
    MANAGE_SYSTEM: "manage_system",
  } as const;

  // Predefined roles with their permissions
  static readonly ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
    super_admin: Object.values(RBACService.PERMISSIONS),
    admin: [
      RBACService.PERMISSIONS.MANAGE_ALL_USERS,
      RBACService.PERMISSIONS.MANAGE_ROLES,
      RBACService.PERMISSIONS.VIEW_AUDIT_LOGS,
      RBACService.PERMISSIONS.MANAGE_SYSTEM,
    ],
    org_admin: [
      // Organization-specific permissions
      RBACService.PERMISSIONS.READ_ORGANIZATION,
      RBACService.PERMISSIONS.UPDATE_ORGANIZATION,
      RBACService.PERMISSIONS.MANAGE_ORG_MEMBERS,
      RBACService.PERMISSIONS.INVITE_ORG_MEMBERS,
      // User management within org
      RBACService.PERMISSIONS.READ_USER,
      RBACService.PERMISSIONS.UPDATE_USER,
      RBACService.PERMISSIONS.ASSIGN_ROLES,
    ],
    moderator: [
      RBACService.PERMISSIONS.READ_USER,
      RBACService.PERMISSIONS.UPDATE_USER,
      RBACService.PERMISSIONS.VIEW_AUDIT_LOGS,
    ],
    user: [
      RBACService.PERMISSIONS.READ_USER,
      RBACService.PERMISSIONS.UPDATE_USER,
      RBACService.PERMISSIONS.MANAGE_API_KEYS,
    ],
  };

  static async createRole(name: RoleName, description?: string): Promise<string | null> {
    try {
      const permissions = JSON.stringify(this.ROLE_PERMISSIONS[name]);

      const [role] = await db.insert(roles).values({
        name,
        description,
        permissions,
      }).returning();

      return role.id;
    } catch (error) {
      console.error("Failed to create role:", error);
      return null;
    }
  }

  static async getUserRoles(userId: string): Promise<RoleName[]> {
    try {
      const userRoleRecords = await db
        .select({
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

      return userRoleRecords.map(record => record.roleName as RoleName);
    } catch (error) {
      console.error("Failed to get user roles:", error);
      return [];
    }
  }

  static async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const userRoleRecords = await db
        .select({
          permissions: roles.permissions,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

      const allPermissions = new Set<Permission>();

      for (const record of userRoleRecords) {
        if (record.permissions) {
          const rolePermissions = JSON.parse(record.permissions) as Permission[];
          rolePermissions.forEach(permission => allPermissions.add(permission));
        }
      }

      return Array.from(allPermissions);
    } catch (error) {
      console.error("Failed to get user permissions:", error);
      return [];
    }
  }

  static async assignRoleToUser(userId: string, roleId: string, assignedBy?: string): Promise<boolean> {
    try {
      await db.insert(userRoles).values({
        userId,
        roleId,
        assignedBy,
      });

      return true;
    } catch (error) {
      console.error("Failed to assign role to user:", error);
      return false;
    }
  }

  static async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    try {
      await db
        .delete(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.roleId, roleId)
          )
        );

      return true;
    } catch (error) {
      console.error("Failed to remove role from user:", error);
      return false;
    }
  }

  static async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permission);
  }

  static async hasRole(userId: string, roleName: RoleName): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles.includes(roleName);
  }

  static async hasAnyRole(userId: string, roleNames: RoleName[]): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return roleNames.some(role => userRoles.includes(role));
  }

  static async hasAllRoles(userId: string, roleNames: RoleName[]): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return roleNames.every(role => userRoles.includes(role));
  }

  static async getRoleByName(name: RoleName) {
    try {
      const [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, name))
        .limit(1);

      return role || null;
    } catch (error) {
      console.error("Failed to get role by name:", error);
      return null;
    }
  }

  static async ensureDefaultRoles(): Promise<void> {
    for (const roleName of Object.keys(this.ROLE_PERMISSIONS) as RoleName[]) {
      const existingRole = await this.getRoleByName(roleName);
      if (!existingRole) {
        await this.createRole(roleName, `${roleName.charAt(0).toUpperCase() + roleName.slice(1).replace('_', ' ')} role`);
      }
    }
  }

  static async assignDefaultRoleToUser(userId: string): Promise<boolean> {
    const userRole = await this.getRoleByName("user");
    if (!userRole) {
      console.error("Default 'user' role not found");
      return false;
    }

    return this.assignRoleToUser(userId, userRole.id);
  }

  /**
   * Check if user has permission globally or within an organization
   */
  static async hasOrgPermission(
    userId: string,
    permission: Permission,
    organizationId?: string
  ): Promise<boolean> {
    // Check if user has global permission (super admin)
    if (await this.hasPermission(userId, permission)) {
      return true;
    }

    // If no organization specified, can't have org-specific permission
    if (!organizationId) {
      return false;
    }

    // Check organization-specific permissions
    return this.hasOrgSpecificPermission(userId, permission, organizationId);
  }

  /**
   * Check organization-specific permission
   */
  static async hasOrgSpecificPermission(
    userId: string,
    permission: Permission,
    organizationId: string
  ): Promise<boolean> {
    try {
      // Check if user is a member of the organization with appropriate role
      const [member] = await db
        .select({
          permissions: roles.permissions,
        })
        .from(organizationMembers)
        .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.isActive, true)
          )
        )
        .limit(1);

      if (!member?.permissions) {
        return false;
      }

      const rolePermissions = JSON.parse(member.permissions) as Permission[];
      return rolePermissions.includes(permission);
    } catch (error) {
      console.error("Failed to check org-specific permission", { error, userId, permission, organizationId });
      return false;
    }
  }

  /**
   * Check if user has a specific role globally
   */
  static async hasGlobalRole(userId: string, roleName: RoleName): Promise<boolean> {
    return this.hasRole(userId, roleName);
  }

  /**
   * Check if user has a specific role in an organization
   */
  static async hasOrgRole(
    userId: string,
    roleName: RoleName,
    organizationId: string
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
      console.error("Failed to check org role", { error, userId, roleName, organizationId });
      return false;
    }
  }

  /**
   * Check if user has any role globally or in organization
   */
  static async hasAnyRoleInOrg(
    userId: string,
    roleNames: RoleName[],
    organizationId?: string
  ): Promise<boolean> {
    // Check global roles
    if (await this.hasAnyRole(userId, roleNames)) {
      return true;
    }

    // Check organization roles if org specified
    if (organizationId) {
      for (const roleName of roleNames) {
        if (await this.hasOrgRole(userId, roleName, organizationId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get user's effective permissions (global + organization-specific)
   */
  static async getEffectivePermissions(
    userId: string,
    organizationId?: string
  ): Promise<Permission[]> {
    const permissions = new Set(await this.getUserPermissions(userId));

    // Add organization-specific permissions if org specified
    if (organizationId) {
      try {
        const [member] = await db
          .select({
            permissions: roles.permissions,
          })
          .from(organizationMembers)
          .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
          .where(
            and(
              eq(organizationMembers.organizationId, organizationId),
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.isActive, true)
            )
          )
          .limit(1);

        if (member?.permissions) {
          const rolePermissions = JSON.parse(member.permissions) as Permission[];
          rolePermissions.forEach(permission => permissions.add(permission));
        }
      } catch (error) {
        console.error("Failed to get org permissions", { error, userId, organizationId });
      }
    }

    return Array.from(permissions);
  }

  /**
   * Check if user can perform action on a specific resource
   */
  static async canPerformAction(
    userId: string,
    action: Permission,
    resourceType: string,
    resourceId?: string,
    organizationId?: string
  ): Promise<boolean> {
    // Check global permissions first
    if (await this.hasPermission(userId, action)) {
      return true;
    }

    // For organization-scoped actions, check org permissions
    if (organizationId && this.isOrgScopedPermission(action)) {
      return await this.hasOrgSpecificPermission(userId, action, organizationId);
    }

    // For user-specific actions, check if user owns the resource
    if (resourceType === 'user' && resourceId === userId) {
      return true;
    }

    return false;
  }

  /**
   * Check if a permission is organization-scoped
   */
  static isOrgScopedPermission(permission: Permission): boolean {
    const orgPermissions: Permission[] = [
      this.PERMISSIONS.READ_ORGANIZATION,
      this.PERMISSIONS.UPDATE_ORGANIZATION,
      this.PERMISSIONS.MANAGE_ORG_MEMBERS,
      this.PERMISSIONS.INVITE_ORG_MEMBERS,
    ];

    return orgPermissions.includes(permission);
  }
}

