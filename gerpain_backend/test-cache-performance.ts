/**
 * Test script to verify Redis caching + SQL optimization performance
 * 
 * Run with: bun run test-cache-performance.ts
 * 
 * This script:
 * 1. Hits GET /cash-collections/overview (first call = cache miss, hits DB)
 * 2. Hits it again (second call = cache hit, no DB query)
 * 3. Shows response time difference
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000/api/v1";

// Replace these with your actual values from the database
const ORG_ID = process.env.TEST_ORG_ID || "";
const BAKERY_ID = process.env.TEST_BAKERY_ID || "";

if (!ORG_ID) {
  console.error("❌ Please set TEST_ORG_ID environment variable");
  console.error("Example: TEST_ORG_ID=your-org-id bun run test-cache-performance.ts");
  process.exit(1);
}

async function testCachePerformance() {
  console.log("🧪 Testing Collections Overview Performance\n");
  console.log(`API: ${API_BASE}`);
  console.log(`Org: ${ORG_ID}`);
  console.log(`Bakery: ${BAKERY_ID || "(all)"}\n`);

  const headers: Record<string, string> = {
    "X-Organization-ID": ORG_ID,
  };
  if (BAKERY_ID) {
    headers["X-Bakery-ID"] = BAKERY_ID;
  }

  // Test 1: First call (cache miss)
  console.log("📊 Test 1: First call (cache miss, hits DB with optimized SQL)");
  const start1 = Date.now();
  const response1 = await fetch(`${API_BASE}/cash-collections/overview`, {
    headers,
  });
  const duration1 = Date.now() - start1;
  const data1 = await response1.json();
  
  console.log(`   ⏱️  Response time: ${duration1}ms`);
  console.log(`   📦 Cached: ${data1.cached || false}`);
  console.log(`   👥 Employees: ${data1.data?.length || 0}`);

  // Test 2: Second call (cache hit)
  console.log("\n📊 Test 2: Second call (cache hit, no DB query)");
  const start2 = Date.now();
  const response2 = await fetch(`${API_BASE}/cash-collections/overview`, {
    headers,
  });
  const duration2 = Date.now() - start2;
  const data2 = await response2.json();
  
  console.log(`   ⏱️  Response time: ${duration2}ms`);
  console.log(`   📦 Cached: ${data2.cached || false}`);
  console.log(`   👥 Employees: ${data2.data?.length || 0}`);

  // Test 3: With filters (different cache key)
  console.log("\n📊 Test 3: With role filter (new cache key)");
  const start3 = Date.now();
  const response3 = await fetch(`${API_BASE}/cash-collections/overview?role=delivery`, {
    headers,
  });
  const duration3 = Date.now() - start3;
  const data3 = await response3.json();
  
  console.log(`   ⏱️  Response time: ${duration3}ms`);
  console.log(`   📦 Cached: ${data3.cached || false}`);
  console.log(`   👥 Employees: ${data3.data?.length || 0}`);

  // Summary
  console.log("\n📈 Performance Summary:");
  console.log(`   First call (DB):    ${duration1}ms`);
  console.log(`   Second call (cache): ${duration2}ms`);
  console.log(`   Speedup:            ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);
  
  if (data2.cached) {
    console.log("\n✅ Cache is working!");
  } else {
    console.log("\n⚠️  Cache miss on second call - check Redis connection");
  }
}

testCachePerformance().catch(console.error);
