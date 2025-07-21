const { createClient } = require("@supabase/supabase-js");
const db = require("../db");
const { users } = require("../schema/user");

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Middleware to verify Supabase JWT and sync/access local user info
async function supabaseAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.substring(7);

    // Use Supabase to verify the JWT token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Check if user exists in local DB
    let [localUser] = await db.select().from(users).where(users.id.eq(user.id));

    if (!localUser) {
      // Create user in local DB if not found
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        role: user.user_metadata?.role || "doctor",
        isActive: true,
        emailVerified: user.email_confirmed_at ? true : false,
        phoneNumber: user.user_metadata?.phone_number || "",
        lastLoggedInAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      [localUser] = await db.select().from(users).where(users.id.eq(user.id));
    } else {
      // Update lastLoggedInAt
      await db
        .update(users)
        .set({ lastLoggedInAt: new Date(), updatedAt: new Date() })
        .where(users.id.eq(user.id));
      [localUser] = await db.select().from(users).where(users.id.eq(user.id));
    }

    // Attach local user info to req.user
    req.user = localUser;

    next();
  } catch (error) {
    console.error("Supabase auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = supabaseAuthMiddleware;
