import { Context, Next } from "hono";
import { OrganizationService } from "../shared/organization/organization-service.js";
import { RBACService } from "../shared/rbac/rbac-service.js";

export interface OrganizationContext {
  organizationId?: string;
  organization?: any;
  userRole?: string;
}

/**
 * Middleware to extract organization context from URL params or headers
 */
export function organizationContext() {
  return async (c: Context, next: Next) => {
    const orgId = c.req.param("organizationId") ||
                  c.req.header("X-Organization-ID") ||
                  c.req.query("organizationId");

    if (orgId) {
      // Validate organization exists and is active
      const organization = await OrganizationService.getOrganizationById(orgId);
      if (organization && organization.isActive) {
        c.set("organization", organization);
        c.set("organizationId", orgId);

        // Set user role in organization if user is authenticated
        const user = c.get("user");
        if (user) {
          const members = await OrganizationService.getOrganizationMembers(orgId);
          const member = members.find(m => m.userId === user.id);
          if (member?.role) {
            c.set("userOrgRole", member.role.name);
          }
        }
      }
    }

    return next();
  };
}

/**
 * Middleware to require organization membership
 */
export function requireOrgMembership() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const organizationId = c.get("organizationId");

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        }
      }, 401);
    }

    if (!organizationId) {
      return c.json({
        success: false,
        error: {
          code: "ORGANIZATION_REQUIRED",
          message: "Organization context required",
        }
      }, 400);
    }

    const isMember = await OrganizationService.isUserInOrganization(organizationId, user.id);
    if (!isMember) {
      return c.json({
        success: false,
        error: {
          code: "NOT_ORG_MEMBER",
          message: "User is not a member of this organization",
        }
      }, 403);
    }

    return next();
  };
}

/**
 * Middleware to require organization admin role
 */
export function requireOrgAdmin() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const organizationId = c.get("organizationId");

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        }
      }, 401);
    }

    if (!organizationId) {
      return c.json({
        success: false,
        error: {
          code: "ORGANIZATION_REQUIRED",
          message: "Organization context required",
        }
      }, 400);
    }

    // Check if user is org admin or global admin
    const isOrgAdmin = await RBACService.hasOrgRole(user.id, "org_admin", organizationId);
    const isGlobalAdmin = await RBACService.hasGlobalRole(user.id, "super_admin");

    if (!isOrgAdmin && !isGlobalAdmin) {
      return c.json({
        success: false,
        error: {
          code: "INSUFFICIENT_ORG_PERMISSIONS",
          message: "Organization admin permissions required",
        }
      }, 403);
    }

    return next();
  };
}

/**
 * Middleware to require organization permission
 */
export function requireOrgPermission(permission: string) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const organizationId = c.get("organizationId");

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        }
      }, 401);
    }

    const hasPermission = await RBACService.hasOrgPermission(user.id, permission, organizationId);
    if (!hasPermission) {
      return c.json({
        success: false,
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: `Permission '${permission}' required`,
        }
      }, 403);
    }

    return next();
  };
}

/**
 * Middleware to validate organization ownership
 */
export function requireOrgOwnership() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const organization = c.get("organization");

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        }
      }, 401);
    }

    if (!organization) {
      return c.json({
        success: false,
        error: {
          code: "ORGANIZATION_NOT_FOUND",
          message: "Organization not found",
        }
      }, 404);
    }

    if (organization.ownerId !== user.id) {
      return c.json({
        success: false,
        error: {
          code: "NOT_ORG_OWNER",
          message: "Only organization owner can perform this action",
        }
      }, 403);
    }

    return next();
  };
}
