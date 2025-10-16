const userService = require('../services/user.service');
const db = require('../db');
const { users } = require('../schema');
const bcrypt = require('bcrypt');

async function seedDevUsers() {
  const devUsers = [
    {
      email: 'admin@example.com',
      password: 'Password123!',
      firstName: 'Dev',
      lastName: 'Admin',
      role: 'admin',
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'doctor@example.com',
      password: 'Password123!',
      firstName: 'Dev',
      lastName: 'Doctor',
      role: 'doctor',
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'user@example.com',
      password: 'Password123!',
      firstName: 'Dev',
      lastName: 'User',
      role: 'user',
      isActive: true,
      emailVerified: true,
    },
  ];

  console.log('Seeding development users...');

  for (const userData of devUsers) {
    try {
      const existingUser = await db.select().from(users).where(db.eq(users.email, userData.email));

      if (existingUser.length > 0) {
        console.log(`User ${userData.email} already exists. Skipping.`);
        continue;
      }

      // Hash password before passing to service
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = { ...userData, passwordHash: hashedPassword };

      // Use userService to register the user
      // Note: userService.registerUser might have its own validation/logic
      // For dev seeding, we might bypass some of it or use a more direct method
      // For simplicity, we'll call a direct registration method if available or adapt
      if (userData.role === 'admin') {
        await userService.registerAdmin(newUser);
      } else if (userData.role === 'doctor') {
        await userService.registerDoctor(newUser);
      } else {
        // For generic users, if a direct registerUser is not available,
        // you might need to create a simplified version or insert directly.
        // For now, we'll assume registerUser can handle it.
        await userService.registerUser(newUser);
      }

      console.log(`Successfully created user: ${userData.email} (${userData.role})`);
    } catch (error) {
      console.error(`Failed to create user ${userData.email}:`, error.message);
    }
  }

  console.log('Development user seeding complete.');
  process.exit(0);
}

seedDevUsers();
