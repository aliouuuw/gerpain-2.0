import { Context, Next } from "hono";
import { RBACService, Permission, RoleName } from "../shared/rbac/rbac-service.js";

export function requirePermission(permission: Permission) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        }
      }, 401);
    }

    const hasPermission = await RBACService.hasPermission(user.id, permission);

    if (!hasPermission) {
      return c.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        }
      }, 403);
    }

    return next();
  };
}

export function requireRole(roleName: RoleName) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        }
      }, 401);
    }

    const hasRole = await RBACService.hasRole(user.id, roleName);

    if (!hasRole) {
      return c.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient role permissions",
        }
      }, 403);
    }

    return next();
  };
}

export function requireAnyRole(roleNames: RoleName[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        }
      }, 401);
    }

    const hasAnyRole = await RBACService.hasAnyRole(user.id, roleNames);

    if (!hasAnyRole) {
      return c.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Required roles: ${roleNames.join(", ")}`,
        }
      }, 403);
    }

    return next();
  };
}

export function requireAllRoles(roleNames: RoleName[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        }
      }, 401);
    }

    const hasAllRoles = await RBACService.hasAllRoles(user.id, roleNames);

    if (!hasAllRoles) {
      return c.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `All roles required: ${roleNames.join(", ")}`,
        }
      }, 403);
    }

    return next();
  };
}

// Admin-only middleware (convenience function)
export const requireAdmin = requireRole("admin");

// Moderator or Admin middleware (convenience function)
export const requireModeratorOrAdmin = requireAnyRole(["moderator", "admin"]);

