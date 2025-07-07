const db = require("./src/db");
const { users } = require("./src/schema");
const { sql } = require("drizzle-orm");

async function testDatabaseConnection() {
  try {
    console.log("Testing database connection...");
    const result = await db.select({ connected: sql`1` });
    console.log("✅ Database connection test passed:", result);
    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    return false;
  }
}

async function testCountFunction() {
  try {
    console.log("Testing count function...");
    const result = await db.select({ count: sql`count(*)` }).from(users);
    console.log("✅ Count function test passed:", result);
    return true;
  } catch (error) {
    console.error("❌ Count function test failed:", error);
    return false;
  }
}

async function runTests() {
  console.log("🧪 Running Drizzle ORM compatibility tests...\n");
  
  const dbTest = await testDatabaseConnection();
  const countTest = await testCountFunction();
  
  console.log("\n📊 Test Results:");
  console.log(`Database Connection: ${dbTest ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Count Function: ${countTest ? "✅ PASS" : "❌ FAIL"}`);
  
  if (dbTest && countTest) {
    console.log("\n🎉 All tests passed! The fixes are working correctly.");
  } else {
    console.log("\n⚠️  Some tests failed. Please check the errors above.");
  }
  
  process.exit(0);
}

runTests().catch(console.error); 