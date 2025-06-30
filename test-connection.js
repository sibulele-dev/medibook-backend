const postgres = require("postgres");
require("dotenv").config();

console.log("🔍 Testing Supabase connection...");
console.log("📡 DATABASE_URL:", process.env.DATABASE_URL ? "Found" : "Missing");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env file");
  process.exit(1);
}

// Parse the connection string to show what we're connecting to
const url = new URL(process.env.DATABASE_URL);
console.log("🌐 Host:", url.hostname);
console.log("🔌 Port:", url.port);
console.log("👤 User:", url.username);
console.log("🗄️  Database:", url.pathname.slice(1));

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  timeout: 10,
  onnotice: () => {},
});

console.log("🔄 Attempting connection...");

sql`SELECT NOW() as current_time, version() as pg_version`
  .then((res) => {
    console.log("✅ Connection successful!");
    console.log("⏰ Current time:", res[0].current_time);
    console.log("📊 PostgreSQL version:", res[0].pg_version.split(" ")[0]);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Connection failed!");
    console.error("🔍 Error details:");

    if (err.code === "ECONNREFUSED") {
      console.error("   → Network connection refused");
      console.error("   → Check if you have internet access");
      console.error("   → Check if your firewall blocks port 5432");
    } else if (err.code === "ENOTFOUND") {
      console.error("   → Host not found");
      console.error("   → Check your DATABASE_URL hostname");
    } else if (err.message.includes("authentication")) {
      console.error("   → Authentication failed");
      console.error("   → Check your username/password in DATABASE_URL");
    } else if (err.message.includes("database")) {
      console.error("   → Database not found");
      console.error("   → Check your database name in DATABASE_URL");
    } else {
      console.error("   → Error code:", err.code);
      console.error("   → Error message:", err.message);
    }

    console.error("\n🔧 Possible solutions:");
    console.error("   1. Check your internet connection");
    console.error("   2. Verify your Supabase project is active");
    console.error("   3. Check your DATABASE_URL format");
    console.error("   4. Try connecting from a different network");
    console.error("   5. Check Supabase dashboard for any restrictions");

    process.exit(1);
  });
