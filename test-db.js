const db = require("./src/db");

async function testDatabase() {
  try {
    console.log("Testing database connection...");
    
    // Test basic connection
    const result = await db.execute("SELECT NOW() as current_time");
    console.log("✅ Database connection successful:", result[0].current_time);
    
    // Check users table structure
    console.log("\nChecking users table structure...");
    const tableInfo = await db.execute(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log("Users table columns:");
    tableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if phone_number column exists
    const phoneColumn = tableInfo.find(col => col.column_name === 'phone_number');
    if (phoneColumn) {
      console.log("\n✅ phone_number column exists");
    } else {
      console.log("\n❌ phone_number column does NOT exist");
    }
    
    // Check if password_hash column exists
    const passwordColumn = tableInfo.find(col => col.column_name === 'password_hash');
    if (passwordColumn) {
      console.log("✅ password_hash column exists");
    } else {
      console.log("❌ password_hash column does NOT exist");
    }
    
  } catch (error) {
    console.error("❌ Database test failed:", error.message);
    console.error("Full error:", error);
  } finally {
    process.exit(0);
  }
}

testDatabase(); 