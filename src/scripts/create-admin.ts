#!/usr/bin/env bun

/**
 * Script to create an admin user via the API
 * Usage: bun run src/scripts/create-admin.ts [email] [password] [name]
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const email = process.argv[2] || "admin@example.com";
const password = process.argv[3] || "admin123!";
const name = process.argv[4] || "Admin User";

async function createAdminUser() {
  try {
    console.log(`🚀 Creating admin user...`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🔗 API URL: ${BASE_URL}`);

    // First check if server is running
    try {
      const healthResponse = await fetch(`${BASE_URL}/health`, { 
        signal: AbortSignal.timeout(5000)
      });
      if (!healthResponse.ok) {
        throw new Error("Server not responding");
      }
    } catch (error) {
      console.error("❌ Server is not running or not accessible");
      console.log("\n🔧 Please start the server first:");
      console.log("1. bun run dev");
      console.log("2. Wait for 'Server starting on port 3000' message");
      process.exit(1);
    }

    const response = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log("✅ Admin user created successfully!");
      console.log(`👤 User ID: ${data.data.user.id}`);
      console.log(`📧 Email: ${data.data.user.email}`);
      console.log(`📝 Name: ${data.data.user.name}`);
      console.log(`🔐 Session ID: ${data.data.sessionId}`);

      // Extract session cookie for future use
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        console.log("\n🍪 Session cookie set for authentication");
        console.log("💡 You can now make authenticated requests with this session");
      }

      console.log("\n🔑 Next steps:");
      console.log("1. Save these credentials securely");
      console.log("2. Use the session cookie for subsequent API calls");
      console.log("3. Or use the email/password to sign in via the web interface");

    } else if (response.status === 409) {
      console.log("⚠️  Admin user already exists!");
      console.log(`📧 Email: ${email}`);
      console.log("💡 Try signing in instead or use a different email address");
      process.exit(0);
    } else {
      console.error("❌ Failed to create admin user:");
      console.error(`Status: ${response.status}`);
      console.error(`Error: ${data.error?.message || "Unknown error"}`);

      if (data.error?.code === "VALIDATION_ERROR") {
        console.log("\n🔍 Validation issues:");
        console.log("- Email must be valid format");
        console.log("- Password must be at least 8 characters");
      }

      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error creating admin user:");
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
    } else {
      console.error("Unknown error occurred");
    }

    console.log("\n🔧 Troubleshooting:");
    console.log("1. Make sure the server is running: bun run dev");
    console.log("2. Check if PostgreSQL is running and accessible");
    console.log("3. Verify DATABASE_URL environment variable");
    console.log("4. Ensure migrations have been run: bun run db:migrate");
    console.log("5. Check network connectivity to the API");

    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.main) {
  createAdminUser();
}
