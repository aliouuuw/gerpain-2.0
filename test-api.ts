import { db } from "./src/config/database.js";
import { organizations, locations, products, employees, deliveryRuns, cashCollections } from "./src/shared/database/schema.js";
import { eq } from "drizzle-orm";

async function testAPI() {
  console.log("🧪 Running API Smoke Tests\n");

  // Get organization ID
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, "acme-corp"));
  
  if (!org) {
    console.error("❌ Organization 'acme-corp' not found. Run seed script first.");
    process.exit(1);
  }

  console.log(`✅ Found organization: ${org.name} (${org.id})\n`);
  const orgId = org.id;

  // Test 1: Locations
  console.log("📍 Testing Locations...");
  const locs = await db.select().from(locations).where(eq(locations.organizationId, orgId));
  console.log(`   Found ${locs.length} locations`);
  if (locs.length > 0) {
    console.log(`   ✅ Sample: ${locs[0].name} (${locs[0].type})`);
  } else {
    console.log("   ⚠️  No locations found");
  }

  // Test 2: Products
  console.log("\n🍞 Testing Products...");
  const prods = await db.select().from(products).where(eq(products.organizationId, orgId));
  console.log(`   Found ${prods.length} products`);
  if (prods.length > 0) {
    console.log(`   ✅ Sample: ${prods[0].name} (${prods[0].category}, ${prods[0].unitPrice} XOF)`);
  } else {
    console.log("   ⚠️  No products found");
  }

  // Test 3: Employees
  console.log("\n👥 Testing Employees...");
  const emps = await db.select().from(employees).where(eq(employees.organizationId, orgId));
  console.log(`   Found ${emps.length} employees`);
  if (emps.length > 0) {
    console.log(`   ✅ Sample: ${emps[0].firstName} ${emps[0].lastName} (${emps[0].role})`);
  } else {
    console.log("   ⚠️  No employees found");
  }

  // Test 4: Delivery Runs
  console.log("\n🚚 Testing Delivery Runs...");
  const runs = await db.select().from(deliveryRuns).where(eq(deliveryRuns.organizationId, orgId));
  console.log(`   Found ${runs.length} delivery runs`);
  if (runs.length > 0) {
    console.log(`   ✅ Sample: Run on ${runs[0].date} (${runs[0].status})`);
  } else {
    console.log("   ⚠️  No delivery runs found");
  }

  // Test 5: Cash Collections
  console.log("\n💰 Testing Cash Collections...");
  const collections = await db.select().from(cashCollections).where(eq(cashCollections.organizationId, orgId));
  console.log(`   Found ${collections.length} cash collections`);
  if (collections.length > 0) {
    console.log(`   ✅ Sample: Collection on ${collections[0].date} (${collections[0].status})`);
  } else {
    console.log("   ⚠️  No cash collections found");
  }

  // Test 6: API Endpoints via HTTP
  console.log("\n🌐 Testing HTTP API Endpoints...");
  const baseUrl = "http://localhost:3000/api/v1";
  const headers = {
    "X-Organization-ID": orgId,
    "Content-Type": "application/json",
  };

  try {
    // Test locations endpoint
    const locResponse = await fetch(`${baseUrl}/locations`, { headers });
    const locData = await locResponse.json();
    console.log(`   GET /locations: ${locResponse.status} - ${locData.success ? '✅' : '❌'}`);
    if (locData.success) {
      console.log(`      → ${locData.data.length} locations returned`);
    }

    // Test products endpoint
    const prodResponse = await fetch(`${baseUrl}/products`, { headers });
    const prodData = await prodResponse.json();
    console.log(`   GET /products: ${prodResponse.status} - ${prodData.success ? '✅' : '❌'}`);
    if (prodData.success) {
      console.log(`      → ${prodData.data.length} products returned`);
    }

    // Test employees endpoint
    const empResponse = await fetch(`${baseUrl}/employees`, { headers });
    const empData = await empResponse.json();
    console.log(`   GET /employees: ${empResponse.status} - ${empData.success ? '✅' : '❌'}`);
    if (empData.success) {
      console.log(`      → ${empData.data.length} employees returned`);
    }

    // Test delivery runs endpoint
    const runResponse = await fetch(`${baseUrl}/delivery-runs/runs`, { headers });
    const runData = await runResponse.json();
    console.log(`   GET /delivery-runs/runs: ${runResponse.status} - ${runData.success ? '✅' : '❌'}`);
    if (runData.success) {
      console.log(`      → ${runData.data.length} runs returned`);
    }

    // Test cash collections endpoint
    const collResponse = await fetch(`${baseUrl}/cash-collections`, { headers });
    const collData = await collResponse.json();
    console.log(`   GET /cash-collections: ${collResponse.status} - ${collData.success ? '✅' : '❌'}`);
    if (collData.success) {
      console.log(`      → ${collData.data.length} collections returned`);
    }

  } catch (error) {
    console.error("   ❌ HTTP request failed:", error);
  }

  console.log("\n✨ Smoke tests completed!");
  process.exit(0);
}

testAPI().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
