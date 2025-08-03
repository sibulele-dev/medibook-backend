const db = require("./src/db");

async function testUser() {
  try {
    console.log("Testing user data...");
    
    const result = await db.execute(`
      SELECT id, email, first_name, last_name, password_hash, email_verified 
      FROM users 
      WHERE email = 'sibulelemduz@gmail.com'
    `);
    
    console.log("User data:", result);
    
    if (result.length > 0) {
      const user = result[0];
      console.log("Password hash exists:", !!user.password_hash);
      console.log("Email verified:", user.email_verified);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

testUser(); 