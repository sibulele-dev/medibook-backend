const permissionService = require('../services/permission.service');
const db = require('../db');

async function seedPermissionsAndDepartments() {
  try {
    console.log('🌱 Starting permission and department seeding...');

    // Seed default permissions
    console.log('📋 Seeding default permissions...');
    const permissionsSeeded = await permissionService.seedDefaultPermissions();
    if (permissionsSeeded) {
      console.log('✅ Default permissions seeded successfully');
    } else {
      console.log('❌ Failed to seed default permissions');
    }

    // Seed default departments
    console.log('🏢 Seeding default departments...');
    const departmentsSeeded = await permissionService.seedDefaultDepartments();
    if (departmentsSeeded) {
      console.log('✅ Default departments seeded successfully');
    } else {
      console.log('❌ Failed to seed default departments');
    }

    // Display seeded data
    console.log('\n📊 Seeded Data Summary:');
    
    const permissions = await permissionService.getAllPermissions();
    console.log(`📋 Permissions: ${permissions.length} total`);
    permissions.forEach(permission => {
      console.log(`   - ${permission.name}: ${permission.description}`);
    });

    const departments = await permissionService.getAllDepartments();
    console.log(`\n🏢 Departments: ${departments.length} total`);
    departments.forEach(department => {
      console.log(`   - ${department.name}: ${department.privileges.length} privileges`);
      department.privileges.forEach(privilege => {
        console.log(`     * ${privilege}`);
      });
    });

    console.log('\n🎉 Permission and department seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding permissions and departments:', error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedPermissionsAndDepartments();
}

module.exports = { seedPermissionsAndDepartments };
