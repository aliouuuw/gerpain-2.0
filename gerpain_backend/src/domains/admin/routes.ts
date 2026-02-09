import { Hono } from "hono";
import { AdminHandlers } from "./handlers.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAdmin } from "../../middleware/rbac.js";
import { requireOrgAdmin, requireOrgPermission, organizationContext } from "../../middleware/organization.js";
import { RBACService } from "../../shared/rbac/rbac-service.js";

const admin = new Hono();

// Apply organization context to all routes
admin.use("*", organizationContext());

// User Management Routes
admin.post("/users", requireAuth, requireAdmin, AdminHandlers.createUser);
admin.get("/users", requireAuth, requireAdmin, AdminHandlers.listUsers);
admin.get("/users/:id", requireAuth, requireAdmin, AdminHandlers.getUser);
admin.put("/users/:id", requireAuth, requireAdmin, AdminHandlers.updateUser);
admin.delete("/users/:id", requireAuth, requireAdmin, AdminHandlers.deleteUser);

// Role Assignment Routes
admin.post("/users/:id/roles", requireAuth, requireAdmin, AdminHandlers.assignUserRole);
admin.delete("/users/:id/roles/:roleId", requireAuth, requireAdmin, AdminHandlers.removeUserRole);

// Organization Management Routes
admin.post("/organizations", requireAuth, requireAdmin, AdminHandlers.createOrganization);
admin.get("/organizations", requireAuth, requireAdmin, AdminHandlers.listOrganizations);
admin.get("/organizations/:id", requireAuth, requireOrgAdmin, AdminHandlers.getOrganization);
admin.put("/organizations/:id", requireAuth, requireOrgAdmin, AdminHandlers.updateOrganization);
admin.delete("/organizations/:id", requireAuth, requireOrgAdmin, AdminHandlers.deleteOrganization);

// Organization Member Management Routes
admin.post("/organizations/:id/invitations", requireAuth, requireOrgPermission(RBACService.PERMISSIONS.INVITE_ORG_MEMBERS), AdminHandlers.inviteUserToOrganization);
admin.delete("/organizations/:id/members/:userId", requireAuth, requireOrgPermission(RBACService.PERMISSIONS.MANAGE_ORG_MEMBERS), AdminHandlers.removeUserFromOrganization);

// TODO: Add more admin routes:
// - Bulk user operations
// - Organization settings management
// - Audit log viewing
// - System statistics
// - User activity reports

export { admin };
