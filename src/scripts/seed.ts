import { db } from "../config/database.js";
import { users, apiKeys, roles, userRoles, organizations } from "../shared/database/schema.js";
import bcrypt from "bcryptjs";
import { generateRandomString } from "../shared/utils/crypto.js";
import { RBACService } from "../shared/rbac/rbac-service.js";
import { OrganizationService } from "../shared/organization/organization-service.js";

async function seed() {
  console.log("Starting database seed...");

  try {
    // Ensure default roles exist
    console.log("Creating default roles...");
    await RBACService.ensureDefaultRoles();

    // Create super admin user
    console.log("Creating super admin user...");
    const adminPassword = await bcrypt.hash("admin123", 10);

    const [adminUser] = await db.insert(users).values({
      email: "admin@example.com",
      hashedPassword: adminPassword,
      name: "Super Admin User",
      emailVerified: true,
    }).returning();

    // Assign super admin role
    const superAdminRole = await RBACService.getRoleByName("super_admin");
    if (superAdminRole) {
      await RBACService.assignRoleToUser(adminUser.id, superAdminRole.id);
    }

    console.log("Created super admin user:", adminUser.email);
    console.log("Super admin login: admin@example.com / admin123");

    // Create sample organization
    console.log("Creating sample organization...");
    const orgSlug = await OrganizationService.ensureUniqueSlug("acme-corp");
    const orgId = await OrganizationService.createOrganization(
      "Acme Corporation",
      orgSlug,
      adminUser.id,
      "A sample organization for testing"
    );

    if (orgId) {
      console.log("Created organization:", orgSlug);

      // Create org admin user
      const orgAdminPassword = await bcrypt.hash("orgadmin123", 10);
      const [orgAdminUser] = await db.insert(users).values({
        email: "orgadmin@example.com",
        hashedPassword: orgAdminPassword,
        name: "Org Admin User",
        emailVerified: true,
      }).returning();

      // Assign user role globally
      await RBACService.assignDefaultRoleToUser(orgAdminUser.id);

      // Add to organization as org admin
      const orgAdminRole = await RBACService.getRoleByName("org_admin");
      if (orgAdminRole) {
        await OrganizationService.addUserToOrganization(orgId, orgAdminUser.id, orgAdminRole.id, adminUser.id);
      }

      console.log("Created org admin user:", orgAdminUser.email);
      console.log("Org admin login: orgadmin@example.com / orgadmin123");
    }

    // Create a test user
    const hashedPassword = await bcrypt.hash("password123", 10);

    const [testUser] = await db.insert(users).values({
      email: "test@example.com",
      hashedPassword,
      name: "Test User",
      emailVerified: true,
    }).returning();

    // Assign default user role globally
    await RBACService.assignDefaultRoleToUser(testUser.id);

    // Add test user to organization if it exists
    if (orgId) {
      const userRole = await RBACService.getRoleByName("user");
      if (userRole) {
        await OrganizationService.addUserToOrganization(orgId, testUser.id, userRole.id, adminUser.id);
      }
    }

    console.log("Created test user:", testUser.email);
    console.log("Test login: test@example.com / password123");

    // Create a test API key
    const apiKey = generateRandomString(32);
    await db.insert(apiKeys).values({
      userId: testUser.id,
      name: "Test API Key",
      key: apiKey,
    });

    console.log("Created test API key:", apiKey);
    console.log("Seed completed successfully!");

  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();


