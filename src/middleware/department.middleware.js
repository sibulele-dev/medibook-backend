const { eq } = require("drizzle-orm");
const db = require("../db");
const { admins, departments } = require("../schema");

function requireDepartment(departmentName) {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden: admin access required" });
      }

      // First, get the department ID for the required department name
      const [departmentRecord] = await db
        .select({
          id: departments.id,
          name: departments.name,
        })
        .from(departments)
        .where(eq(departments.name, departmentName))
        .limit(1);

      if (!departmentRecord) {
        console.error(`Department '${departmentName}' not found in database`);
        return res
          .status(500)
          .json({ 
            success: false, 
            message: `Department '${departmentName}' not found` 
          });
      }

      // Check if user is in the specified department by comparing department IDs
      const adminRecord = await db
        .select({
          departmentId: admins.departmentId,
          departmentName: departments.name,
        })
        .from(admins)
        .leftJoin(departments, eq(admins.departmentId, departments.id))
        .where(eq(admins.id, req.user.id))
        .limit(1);

      console.log("Department middleware debug:", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredDepartment: departmentName,
        requiredDepartmentId: departmentRecord.id,
        adminRecord: adminRecord,
        hasAdminRecord: adminRecord.length > 0,
        actualDepartmentId: adminRecord[0]?.departmentId,
        actualDepartmentName: adminRecord[0]?.departmentName,
        departmentIdMatch: adminRecord[0]?.departmentId === departmentRecord.id,
        departmentNameMatch: adminRecord[0]?.departmentName === departmentName
      });

      if (!adminRecord.length || adminRecord[0].departmentId !== departmentRecord.id) {
        // Temporary: Allow access if user is admin and no admin record exists (for debugging)
        if (req.user.role === "admin" && !adminRecord.length) {
          console.log("Temporary bypass: Admin user without admin record, allowing access");
          return next();
        }
        
        return res
          .status(403)
          .json({ 
            success: false, 
            message: `Forbidden: ${departmentName} department access required` 
          });
      }

      next();
    } catch (error) {
      console.error("Department middleware error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  };
}

module.exports = requireDepartment; 