const db = require('./src/db');

const createPracticesTable = async () => {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS "practices" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "phone" text,
        "address" text,
        "specialization" text DEFAULT 'General Practice',
        "description" text,
        "status" text DEFAULT 'active',
        "website" text,
        "operating_hours" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    
    await db.execute(sql);
    console.log('✅ Practices table created successfully');
  } catch (error) {
    console.error('❌ Error creating practices table:', error.message);
  } finally {
    process.exit(0);
  }
};

createPracticesTable(); 