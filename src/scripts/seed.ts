import { db } from "../config/database.js";
import { sql } from "drizzle-orm";
import {
  users,
  apiKeys,
  organizations,
  bakeries,
  locations,
  categories,
  products,
  employees,
  employeeLocations,
} from "../shared/database/schema.js";
import bcrypt from "bcryptjs";
import { generateRandomString } from "../shared/utils/crypto.js";
import { RBACService } from "../shared/rbac/rbac-service.js";
import { OrganizationService } from "../shared/organization/organization-service.js";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🧹 Cleaning domain tables...");
  await db.execute(sql`TRUNCATE TABLE delivery_items, delivery_runs, cash_collections, inventory_items, pricing_rules, employee_locations, employees, products, categories, locations, bakeries CASCADE`);
  console.log("   Domain tables cleaned.\n");

  // ─── Auth & Roles ───────────────────────────────────
  console.log("🔑 Setting up roles...");
  await RBACService.ensureDefaultRoles();

  console.log("👤 Creating admin user...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  let [adminUser] = await db.select().from(users).where(eq(users.email, "admin@gerpain.com"));
  if (!adminUser) {
    [adminUser] = await db.insert(users).values({
      email: "admin@gerpain.com",
      hashedPassword: adminPassword,
      name: "Admin Gerpain",
      emailVerified: true,
    }).returning();
  }
  const superAdminRole = await RBACService.getRoleByName("super_admin");
  if (superAdminRole) {
    await RBACService.assignRoleToUser(adminUser.id, superAdminRole.id);
  }
  console.log("   Login: admin@gerpain.com / admin123\n");

  // ─── Organization ───────────────────────────────────
  console.log("🏢 Creating organization...");
  let [org] = await db.select().from(organizations).where(eq(organizations.slug, "gerpain"));
  if (!org) {
    const orgId = await OrganizationService.createOrganization(
      "Gerpain Boulangerie",
      "gerpain",
      adminUser.id,
      "Chaîne de boulangeries — Dakar, Sénégal",
    );
    [org] = await db.select().from(organizations).where(eq(organizations.id, orgId!));
  }
  console.log(`   Organization: ${org.name} (${org.slug})\n`);

  // ─── Bakery ─────────────────────────────────────────
  console.log("🍞 Creating bakery...");
  const [bakery] = await db.insert(bakeries).values({
    organizationId: org.id,
    name: "Boulangerie Centrale",
    code: "BC",
    address: "12 Avenue Cheikh Anta Diop, Dakar",
    phone: "+221 33 820 00 00",
  }).returning();
  console.log(`   Bakery: ${bakery.name} [${bakery.code}]\n`);

  // ─── Locations ──────────────────────────────────────
  console.log("📍 Creating locations...");
  const [boutique] = await db.insert(locations).values({
    organizationId: org.id,
    bakeryId: bakery.id,
    name: "Boutique Centre-ville",
    type: "shop",
    address: "45 Rue Carnot, Plateau, Dakar",
    phone: "+221 33 821 11 11",
  }).returning();

  const [depot] = await db.insert(locations).values({
    organizationId: org.id,
    bakeryId: bakery.id,
    name: "Dépôt Principal",
    type: "warehouse",
    address: "Zone Industrielle, Hann, Dakar",
    phone: "+221 33 832 22 22",
  }).returning();
  console.log(`   ${boutique.name} (shop)`);
  console.log(`   ${depot.name} (warehouse)\n`);

  // ─── Categories ─────────────────────────────────────
  console.log("📦 Creating categories...");
  const catData = [
    { name: "Pain", description: "Pains traditionnels", color: "#D97706", sortOrder: 1 },
    { name: "Viennoiserie", description: "Croissants, brioches, etc.", color: "#059669", sortOrder: 2 },
    { name: "Boissons", description: "Jus, eaux, sodas", color: "#2563EB", sortOrder: 3 },
    { name: "Consommables", description: "Snacks et autres", color: "#7C3AED", sortOrder: 4 },
  ];
  const insertedCategories = await db.insert(categories).values(
    catData.map(c => ({ ...c, organizationId: org.id }))
  ).returning();
  const catMap = Object.fromEntries(insertedCategories.map(c => [c.name, c.id]));
  console.log(`   ${insertedCategories.map(c => c.name).join(", ")}\n`);

  // ─── Products ───────────────────────────────────────
  console.log("🛒 Creating products...");
  const prodData = [
    { name: "Pain Kilo",     unitPrice: 1500, categoryId: catMap["Pain"] },
    { name: "Pain Moyen",    unitPrice: 250,  categoryId: catMap["Pain"] },
    { name: "Pain Petit",    unitPrice: 150,  categoryId: catMap["Pain"] },
    { name: "Croissant",     unitPrice: 400,  categoryId: catMap["Viennoiserie"] },
    { name: "Pain au chocolat", unitPrice: 450, categoryId: catMap["Viennoiserie"] },
    { name: "Brioche",       unitPrice: 350,  categoryId: catMap["Viennoiserie"] },
    { name: "Jus d'orange",  unitPrice: 800,  categoryId: catMap["Boissons"] },
    { name: "Eau minérale",  unitPrice: 300,  categoryId: catMap["Boissons"] },
    { name: "Fataya",        unitPrice: 250,  categoryId: catMap["Consommables"] },
  ];
  const insertedProducts = await db.insert(products).values(
    prodData.map(p => ({ ...p, organizationId: org.id }))
  ).returning();
  for (const p of insertedProducts) {
    console.log(`   ${p.name.padEnd(20)} ${String(p.unitPrice).padStart(5)} FCFA`);
  }
  console.log();

  // ─── Employees ──────────────────────────────────────
  console.log("👥 Creating employees...");
  const empData = [
    { firstName: "Ali",      lastName: "Konaté",  role: "delivery" as const, phone: "+221 77 100 00 01" },
    { firstName: "Amina",    lastName: "Diallo",  role: "delivery" as const, phone: "+221 77 100 00 02" },
    { firstName: "Moussa",   lastName: "Traoré",  role: "delivery" as const, phone: "+221 77 100 00 03" },
    { firstName: "Marie",    lastName: "Camara",  role: "cashier"  as const, phone: "+221 77 100 00 04" },
    { firstName: "Aminata",  lastName: "Ba",      role: "manager"  as const, phone: "+221 77 100 00 05" },
  ];
  const insertedEmployees = await db.insert(employees).values(
    empData.map(e => ({
      ...e,
      organizationId: org.id,
      bakeryId: bakery.id,
      status: "active" as const,
      commissionRate: 0,
      hireDate: "2025-01-01",
    }))
  ).returning();

  // Assign all employees to the boutique
  await db.insert(employeeLocations).values(
    insertedEmployees.map((emp, i) => ({
      employeeId: emp.id,
      locationId: boutique.id,
      isPrimary: true,
    }))
  );

  for (const e of insertedEmployees) {
    console.log(`   ${(e.firstName + " " + e.lastName).padEnd(20)} ${e.role}`);
  }

  // ─── Summary ────────────────────────────────────────
  console.log("\n" + "═".repeat(50));
  console.log("✅ Seed complete!");
  console.log("═".repeat(50));
  console.log(`  Organization : ${org.name}`);
  console.log(`  Bakery       : ${bakery.name}`);
  console.log(`  Locations    : ${2}`);
  console.log(`  Categories   : ${insertedCategories.length}`);
  console.log(`  Products     : ${insertedProducts.length}`);
  console.log(`  Employees    : ${insertedEmployees.length}`);
  console.log(`  Login        : admin@gerpain.com / admin123`);
  console.log("═".repeat(50));
  console.log("\nReady for manual CRUD testing in the app.");

  process.exit(0);
}

seed();


