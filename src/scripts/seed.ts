import { db } from "../config/database.js";
import { 
  users, 
  apiKeys, 
  roles, 
  userRoles, 
  organizations,
  locations,
  products,
  employees,
  employeeLocations,
  deliveryRuns,
  deliveryItems,
  cashCollections,
} from "../shared/database/schema.js";
import bcrypt from "bcryptjs";
import { generateRandomString } from "../shared/utils/crypto.js";
import { RBACService } from "../shared/rbac/rbac-service.js";
import { OrganizationService } from "../shared/organization/organization-service.js";
 import { and, eq } from "drizzle-orm";

 async function getOrCreateUser(params: {
   email: string;
   hashedPassword: string;
   name: string;
 }) {
   const [existing] = await db
     .select()
     .from(users)
     .where(eq(users.email, params.email));

   if (existing) {
     return existing;
   }

   const [created] = await db
     .insert(users)
     .values({
       email: params.email,
       hashedPassword: params.hashedPassword,
       name: params.name,
       emailVerified: true,
     })
     .returning();

   return created;
 }

 async function getOrCreateOrganization(params: {
   slug: string;
   name: string;
   ownerId: string;
   description?: string;
 }) {
   const [existing] = await db
     .select()
     .from(organizations)
     .where(eq(organizations.slug, params.slug));

   if (existing) {
     return existing.id;
   }

   return await OrganizationService.createOrganization(
     params.name,
     params.slug,
     params.ownerId,
     params.description,
   );
 }

async function seed() {
  console.log("Starting database seed...");

  try {
    // Ensure default roles exist
    console.log("Creating default roles...");
    await RBACService.ensureDefaultRoles();

    // Create super admin user
    console.log("Creating super admin user...");
    const adminPassword = await bcrypt.hash("admin123", 10);

    const adminUser = await getOrCreateUser({
      email: "admin@example.com",
      hashedPassword: adminPassword,
      name: "Super Admin User",
    });

    // Assign super admin role
    const superAdminRole = await RBACService.getRoleByName("super_admin");
    if (superAdminRole) {
      await RBACService.assignRoleToUser(adminUser.id, superAdminRole.id);
    }

    console.log("Created super admin user:", adminUser.email);
    console.log("Super admin login: admin@example.com / admin123");

    // Create sample organization
    console.log("Creating sample organization...");
    const orgSlug = "acme-corp";
    const orgId = await getOrCreateOrganization({
      name: "Acme Corporation",
      slug: orgSlug,
      ownerId: adminUser.id,
      description: "A sample organization for testing",
    });

    if (orgId) {
      console.log("Created organization:", orgSlug);

      // Create org admin user
      const orgAdminPassword = await bcrypt.hash("orgadmin123", 10);
      const orgAdminUser = await getOrCreateUser({
        email: "orgadmin@example.com",
        hashedPassword: orgAdminPassword,
        name: "Org Admin User",
      });

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

    const testUser = await getOrCreateUser({
      email: "test@example.com",
      hashedPassword,
      name: "Test User",
    });

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
    const [existingKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, testUser.id), eq(apiKeys.name, "Test API Key")));

    if (existingKey) {
      console.log("Test API key already exists:", existingKey.key);
    } else {
      const apiKey = generateRandomString(32);
      await db.insert(apiKeys).values({
        userId: testUser.id,
        name: "Test API Key",
        key: apiKey,
      });
      console.log("Created test API key:", apiKey);
    }

    // =====================================================
    // DOMAIN DATA SEEDING
    // =====================================================

    if (orgId) {
      console.log("\n--- Seeding domain data ---");

      const [existingLocation] = await db
        .select()
        .from(locations)
        .where(eq(locations.organizationId, orgId))
        .limit(1);

      if (existingLocation) {
        console.log("Domain data already seeded (locations exist). Skipping domain seeding.");
        console.log("\nSeed completed successfully!");
        return;
      }

      // Seed Locations
      console.log("Creating locations...");
      const [loc1] = await db.insert(locations).values({
        organizationId: orgId,
        name: "Boulangerie Centre",
        type: "bakery",
        address: "12 Rue Principale, Dakar",
        phone: "+221 33 123 45 67",
      }).returning();

      const [loc2] = await db.insert(locations).values({
        organizationId: orgId,
        name: "Point de vente Marché",
        type: "shop",
        address: "Place du Marché, Dakar",
        phone: "+221 33 234 56 78",
      }).returning();

      const [loc3] = await db.insert(locations).values({
        organizationId: orgId,
        name: "Dépôt Zone Industrielle",
        type: "warehouse",
        address: "Zone Industrielle, Dakar",
        phone: "+221 33 345 67 89",
      }).returning();

      console.log(`Created ${3} locations`);

      // Seed Products
      console.log("Creating products...");
      const productData = [
        { name: "Baguette tradition", category: "pain", unitPrice: 300 },
        { name: "Pain de mie", category: "pain", unitPrice: 500 },
        { name: "Croissant", category: "viennoiserie", unitPrice: 400 },
        { name: "Pain au chocolat", category: "viennoiserie", unitPrice: 450 },
        { name: "Brioche", category: "viennoiserie", unitPrice: 350 },
        { name: "Sandwich poulet", category: "sandwich", unitPrice: 1500 },
        { name: "Sandwich thon", category: "sandwich", unitPrice: 1200 },
        { name: "Gâteau chocolat", category: "patisserie", unitPrice: 2500 },
        { name: "Tarte aux fruits", category: "patisserie", unitPrice: 2000 },
        { name: "Fataya", category: "snack", unitPrice: 250 },
      ];

      const insertedProducts = await db.insert(products).values(
        productData.map(p => ({ ...p, organizationId: orgId }))
      ).returning();

      console.log(`Created ${insertedProducts.length} products`);

      // Seed Employees
      console.log("Creating employees...");
      const [emp1] = await db.insert(employees).values({
        organizationId: orgId,
        firstName: "Moussa",
        lastName: "Diallo",
        email: "moussa.diallo@gerpain.com",
        phone: "+221 77 123 45 67",
        role: "delivery",
        status: "active",
        commissionRate: 5,
        hireDate: "2023-03-15",
      }).returning();

      const [emp2] = await db.insert(employees).values({
        organizationId: orgId,
        firstName: "Fatou",
        lastName: "Ndiaye",
        email: "fatou.ndiaye@gerpain.com",
        phone: "+221 78 234 56 78",
        role: "cashier",
        status: "active",
        commissionRate: 3,
        hireDate: "2023-06-01",
      }).returning();

      const [emp3] = await db.insert(employees).values({
        organizationId: orgId,
        firstName: "Ibrahima",
        lastName: "Sow",
        email: "ibrahima.sow@gerpain.com",
        phone: "+221 76 345 67 89",
        role: "delivery",
        status: "active",
        commissionRate: 5,
        hireDate: "2024-01-10",
      }).returning();

      const [emp4] = await db.insert(employees).values({
        organizationId: orgId,
        firstName: "Aminata",
        lastName: "Ba",
        email: "aminata.ba@gerpain.com",
        phone: "+221 77 456 78 90",
        role: "manager",
        status: "active",
        commissionRate: 0,
        hireDate: "2022-08-20",
      }).returning();

      const [emp5] = await db.insert(employees).values({
        organizationId: orgId,
        firstName: "Ousmane",
        lastName: "Fall",
        email: "ousmane.fall@gerpain.com",
        phone: "+221 78 567 89 01",
        role: "baker",
        status: "inactive",
        commissionRate: 0,
        hireDate: "2023-02-01",
      }).returning();

      console.log(`Created 5 employees`);

      // Assign employees to locations
      console.log("Assigning employees to locations...");
      await db.insert(employeeLocations).values([
        { employeeId: emp1.id, locationId: loc1.id, isPrimary: true },
        { employeeId: emp1.id, locationId: loc2.id, isPrimary: false },
        { employeeId: emp2.id, locationId: loc1.id, isPrimary: true },
        { employeeId: emp3.id, locationId: loc2.id, isPrimary: true },
        { employeeId: emp4.id, locationId: loc1.id, isPrimary: true },
        { employeeId: emp4.id, locationId: loc2.id, isPrimary: false },
        { employeeId: emp4.id, locationId: loc3.id, isPrimary: false },
        { employeeId: emp5.id, locationId: loc3.id, isPrimary: true },
      ]);

      console.log("Employee-location assignments created");

      // Create sample delivery runs for today
      const today = new Date().toISOString().slice(0, 10);
      console.log(`Creating sample delivery runs for ${today}...`);

      const [run1] = await db.insert(deliveryRuns).values({
        organizationId: orgId,
        employeeId: emp1.id,
        locationId: loc1.id,
        date: today,
        status: "draft",
        notes: "",
      }).returning();

      const [run2] = await db.insert(deliveryRuns).values({
        organizationId: orgId,
        employeeId: emp3.id,
        locationId: loc2.id,
        date: today,
        status: "draft",
        notes: "",
      }).returning();

      // Add sample items to delivery runs
      const periods = ["Matin", "Après-midi"];
      for (const run of [run1, run2]) {
        for (let i = 0; i < 5; i++) {
          const product = insertedProducts[i];
          await db.insert(deliveryItems).values({
            runId: run.id,
            productId: product.id,
            period: periods[i % 2],
            quantityEntrusted: 20 + Math.floor(Math.random() * 30),
            quantityReturned: 0,
            unitPrice: product.unitPrice,
          });
        }
      }

      console.log(`Created 2 delivery runs with items`);

      // Create sample cash collections
      console.log("Creating sample cash collections...");
      await db.insert(cashCollections).values({
        organizationId: orgId,
        employeeId: emp1.id,
        locationId: loc1.id,
        date: today,
        expectedAmount: 185000,
        actualAmount: null,
        status: "pending",
      });

      await db.insert(cashCollections).values({
        organizationId: orgId,
        employeeId: emp3.id,
        locationId: loc2.id,
        date: today,
        expectedAmount: 142000,
        actualAmount: null,
        status: "pending",
      });

      console.log("Created 2 cash collections");
      console.log("\n--- Domain data seeding complete ---");
    }

    console.log("\nSeed completed successfully!");

  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();


