
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fileService = require("../services/file.service");
const userService = require("../services/user.service");
const { hashPassword } = require("../utils/password");
const logger = require("../utils/logger");

/**
 * Get admin dashboard stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Collect stats from multiple sources
    const [
      practicesCount,
      usersCount,
      appointmentsCount,
      recentAppointments,
      practiceStats,
    ] = await Promise.all([
      // Count of all practices
      prisma.practice.count(),
      // Count of all users
      prisma.user.count(),
      // Count of all appointments
      prisma.appointment.count(),
      // Recent appointments (last 7 days)
      prisma.appointment.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        take: 5,
        include: {
          patient: true,
          doctor: true,
          practice: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      // Stats per practice
      prisma.practice.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              appointments: true,
              doctors: true,
              patients: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json({
      practices: practicesCount,
      users: usersCount,
      appointments: appointmentsCount,
      recentAppointments,
      practiceStats,
    });
  } catch (error) {
    logger.error("Admin dashboard stats error:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve admin dashboard stats" });
  }
};

/**
 * Get all practices
 */
exports.getAllPractices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;
    const skip = (page - 1) * parseInt(limit);

    // Build filter conditions
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Get practices with pagination
    const [practices, totalCount] = await Promise.all([
      prisma.practice.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          _count: {
            select: {
              doctors: true,
              patients: true,
              appointments: true,
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.practice.count({ where }),
    ]);

    res.status(200).json({
      practices,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error("Get all practices error:", error);
    res.status(500).json({ message: "Failed to retrieve practices" });
  }
};

/**
 * Get practice by ID
 */
exports.getPracticeById = async (req, res) => {
  try {
    const { id } = req.params;

    const practice = await prisma.practice.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        doctors: {
          select: {
            id: true,
            name: true,
            email: true,
            specialty: true,
            profileImage: true,
          },
        },
        services: true,
        _count: {
          select: {
            patients: true,
            appointments: true,
            doctors: true,
          },
        },
      },
    });

    if (!practice) {
      return res.status(404).json({ message: "Practice not found" });
    }

    res.status(200).json(practice);
  } catch (error) {
    logger.error("Get practice error:", error);
    res.status(500).json({ message: "Failed to retrieve practice" });
  }
};

/**
 * Create a new practice
 */
exports.createPractice = async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    description,
    adminEmail,
    adminName,
    adminPhone,
  } = req.body;

  try {
    // Start transaction to ensure both practice and admin user are created
    const result = await prisma.$transaction(async (tx) => {
      // Create practice
      const practice = await tx.practice.create({
        data: {
          name,
          email,
          phone,
          address,
          description,
          status: "ACTIVE",
        },
      });

      // Generate random password for practice admin
      const password = Math.random().toString(36).slice(-8);
      const hashedPassword = await hashPassword(password);

      // Create practice admin user
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          phone: adminPhone,
          password: hashedPassword,
          role: "PRACTICE_ADMIN",
          practiceId: practice.id,
        },
      });

      // Update practice with admin reference
      await tx.practice.update({
        where: { id: practice.id },
        data: { adminId: admin.id },
      });

      return { practice, admin, temporaryPassword: password };
    });

    // Handle logo upload if provided
    if (req.file) {
      const logoUrl = await fileService.uploadPracticeLogo(
        req.file,
        result.practice.id
      );
      await prisma.practice.update({
        where: { id: result.practice.id },
        data: { logo: logoUrl },
      });
      result.practice.logo = logoUrl;
    }

    // Send welcome email with temporary password to practice admin
    // TODO: Implement email notification service
    // await notificationService.sendPracticeWelcomeEmail(result.admin.email, result.temporaryPassword);

    res.status(201).json({
      message: "Practice created successfully",
      practice: result.practice,
      admin: {
        id: result.admin.id,
        name: result.admin.name,
        email: result.admin.email,
      },
    });
  } catch (error) {
    logger.error("Create practice error:", error);
    res.status(500).json({ message: "Failed to create practice" });
  }
};

/**
 * Update practice
 */
exports.updatePractice = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, description, status } = req.body;

  try {
    // Check if practice exists
    const existingPractice = await prisma.practice.findUnique({
      where: { id },
    });

    if (!existingPractice) {
      return res.status(404).json({ message: "Practice not found" });
    }

    // Update practice
    const practice = await prisma.practice.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        description,
        status,
      },
    });

    // Handle logo update if provided
    if (req.file) {
      const logoUrl = await fileService.uploadPracticeLogo(req.file, id);
      await prisma.practice.update({
        where: { id },
        data: { logo: logoUrl },
      });
      practice.logo = logoUrl;
    }

    res.status(200).json({
      message: "Practice updated successfully",
      practice,
    });
  } catch (error) {
    logger.error("Update practice error:", error);
    res.status(500).json({ message: "Failed to update practice" });
  }
};

/**
 * Delete practice
 */
exports.deletePractice = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if practice exists
    const existingPractice = await prisma.practice.findUnique({
      where: { id },
    });

    if (!existingPractice) {
      return res.status(404).json({ message: "Practice not found" });
    }

    // Instead of hard delete, mark as inactive
    await prisma.practice.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    res.status(200).json({ message: "Practice deactivated successfully" });
  } catch (error) {
    logger.error("Delete practice error:", error);
    res.status(500).json({ message: "Failed to delete practice" });
  }
};

/**
 * Get all system users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role, practiceId } = req.query;
    const skip = (page - 1) * parseInt(limit);

    // Build filter conditions
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (practiceId) {
      where.practiceId = practiceId;
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          practice: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      users,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error("Get all users error:", error);
    res.status(500).json({ message: "Failed to retrieve users" });
  }
};

/**
 * Create a system admin user
 */
exports.createSystemAdmin = async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Create system admin user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "SYSTEM_ADMIN",
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "System admin created successfully",
      user,
    });
  } catch (error) {
    logger.error("Create system admin error:", error);
    res.status(500).json({ message: "Failed to create system admin" });
  }
};

/**
 * Update user status (activate/deactivate)
 */
exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user status
    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    res.status(200).json({
      message: "User status updated successfully",
      user,
    });
  } catch (error) {
    logger.error("Update user status error:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
};

/**
 * Get system metrics
 */
exports.getSystemMetrics = async (req, res) => {
  try {
    const { period = "week" } = req.query;

    let dateFilter;
    const now = new Date();

    // Set date filter based on period
    switch (period) {
      case "day":
        dateFilter = { gte: new Date(now.setHours(0, 0, 0, 0)) };
        break;
      case "week":
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { gte: weekAgo };
        break;
      case "month":
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { gte: monthAgo };
        break;
      case "year":
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = { gte: yearAgo };
        break;
      default:
        const defaultPeriod = new Date();
        defaultPeriod.setDate(defaultPeriod.getDate() - 7);
        dateFilter = { gte: defaultPeriod };
    }

    // Get metrics data
    const [
      newUsers,
      newPractices,
      newAppointments,
      appointmentsByStatus,
      appointmentsByPractice,
    ] = await Promise.all([
      // New users in period
      prisma.user.count({
        where: { createdAt: dateFilter },
      }),
      // New practices in period
      prisma.practice.count({
        where: { createdAt: dateFilter },
      }),
      // New appointments in period
      prisma.appointment.count({
        where: { createdAt: dateFilter },
      }),
      // Appointments by status
      prisma.appointment.groupBy({
        by: ["status"],
        where: { createdAt: dateFilter },
        _count: true,
      }),
      // Appointments by practice
      prisma.appointment.groupBy({
        by: ["practiceId"],
        where: { createdAt: dateFilter },
        _count: true,
        orderBy: {
          _count: {
            _all: "desc",
          },
        },
        take: 5,
      }),
    ]);

    // Get practice names for appointment stats
    const practiceIds = appointmentsByPractice.map((item) => item.practiceId);
    const practices = await prisma.practice.findMany({
      where: { id: { in: practiceIds } },
      select: { id: true, name: true },
    });

    // Map practice names to appointment stats
    const appointmentsByPracticeWithNames = appointmentsByPractice.map(
      (item) => ({
        practiceId: item.practiceId,
        practiceName:
          practices.find((p) => p.id === item.practiceId)?.name || "Unknown",
        count: item._count,
      })
    );

    res.status(200).json({
      period,
      newUsers,
      newPractices,
      newAppointments,
      appointmentsByStatus,
      appointmentsByPractice: appointmentsByPracticeWithNames,
    });
  } catch (error) {
    logger.error("Get system metrics error:", error);
    res.status(500).json({ message: "Failed to retrieve system metrics" });
  }
};

/**
 * Get practice performance
 */
exports.getPracticePerformance = async (req, res) => {
  const { id } = req.params;
  const { period = "month" } = req.query;

  try {
    // Check if practice exists
    const practice = await prisma.practice.findUnique({
      where: { id },
    });

    if (!practice) {
      return res.status(404).json({ message: "Practice not found" });
    }

    let dateFilter;
    const now = new Date();

    // Set date filter based on period
    switch (period) {
      case "week":
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { gte: weekAgo };
        break;
      case "month":
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { gte: monthAgo };
        break;
      case "quarter":
        const quarterAgo = new Date();
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        dateFilter = { gte: quarterAgo };
        break;
      case "year":
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = { gte: yearAgo };
        break;
      default:
        const defaultPeriod = new Date();
        defaultPeriod.setMonth(defaultPeriod.getMonth() - 1);
        dateFilter = { gte: defaultPeriod };
    }

    // Get practice performance metrics
    const [
      totalAppointments,
      appointmentsByStatus,
      appointmentsByDoctor,
      newPatients,
      appointmentTrend,
    ] = await Promise.all([
      // Total appointments
      prisma.appointment.count({
        where: {
          practiceId: id,
          createdAt: dateFilter,
        },
      }),
      // Appointments by status
      prisma.appointment.groupBy({
        by: ["status"],
        where: {
          practiceId: id,
          createdAt: dateFilter,
        },
        _count: true,
      }),
      // Appointments by doctor
      prisma.appointment.groupBy({
        by: ["doctorId"],
        where: {
          practiceId: id,
          createdAt: dateFilter,
        },
        _count: true,
      }),
      // New patients
      prisma.patient.count({
        where: {
          practiceId: id,
          createdAt: dateFilter,
        },
      }),
      // Appointment trend over time
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as count
        FROM "Appointment"
        WHERE 
          "practiceId" = ${id}
          AND "createdAt" >= ${dateFilter.gte}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `,
    ]);

    // Get doctor names for appointment stats
    const doctorIds = appointmentsByDoctor.map((item) => item.doctorId);
    const doctors = await prisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true },
    });

    // Map doctor names to appointment stats
    const appointmentsByDoctorWithNames = appointmentsByDoctor.map((item) => ({
      doctorId: item.doctorId,
      doctorName:
        doctors.find((d) => d.id === item.doctorId)?.name || "Unknown",
      count: item._count,
    }));

    res.status(200).json({
      practiceId: id,
      practiceName: practice.name,
      period,
      totalAppointments,
      appointmentsByStatus,
      appointmentsByDoctor: appointmentsByDoctorWithNames,
      newPatients,
      appointmentTrend,
    });
  } catch (error) {
    logger.error("Get practice performance error:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve practice performance" });
  }
};

/**
 * Generate invitation for practice admin
 */
exports.generatePracticeAdminInvitation = async (req, res) => {
  const { practiceId, email, name } = req.body;

  try {
    // Check if practice exists
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
    });

    if (!practice) {
      return res.status(404).json({ message: "Practice not found" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Generate invitation token
    const token = userService.generateInvitationToken();

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        name,
        token,
        role: "PRACTICE_ADMIN",
        practiceId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // TODO: Send invitation email
    // await notificationService.sendInvitationEmail(email, name, token, practice.name);

    res.status(201).json({
      message: "Invitation sent successfully",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    logger.error("Generate practice admin invitation error:", error);
    res.status(500).json({ message: "Failed to generate invitation" });
  }
};

/**
 * Get system configuration
 */
exports.getSystemConfig = async (req, res) => {
  try {
    const config = await prisma.systemConfig.findFirst();

    if (!config) {
      return res
        .status(404)
        .json({ message: "System configuration not found" });
    }

    res.status(200).json(config);
  } catch (error) {
    logger.error("Get system config error:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve system configuration" });
  }
};

/**
 * Update system configuration
 */
exports.updateSystemConfig = async (req, res) => {
  const {
    maintenanceMode,
    allowNewPractices,
    defaultAppointmentDuration,
    maxDailyAppointments,
    emailNotificationsEnabled,
    smsNotificationsEnabled,
  } = req.body;

  try {
    // Get existing config or create new one
    const existingConfig = await prisma.systemConfig.findFirst();

    let config;

    if (existingConfig) {
      // Update existing config
      config = await prisma.systemConfig.update({
        where: { id: existingConfig.id },
        data: {
          maintenanceMode,
          allowNewPractices,
          defaultAppointmentDuration,
          maxDailyAppointments,
          emailNotificationsEnabled,
          smsNotificationsEnabled,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new config
      config = await prisma.systemConfig.create({
        data: {
          maintenanceMode,
          allowNewPractices,
          defaultAppointmentDuration,
          maxDailyAppointments,
          emailNotificationsEnabled,
          smsNotificationsEnabled,
        },
      });
    }

    res.status(200).json({
      message: "System configuration updated successfully",
      config,
    });
  } catch (error) {
    logger.error("Update system config error:", error);
    res.status(500).json({ message: "Failed to update system configuration" });
  }
};

/**
 * Get system activity logs
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      user,
      action,
      practiceId,
      startDate,
      endDate,
    } = req.query;
    const skip = (page - 1) * parseInt(limit);

    // Build filter conditions
    const where = {};

    if (user) {
      where.userId = user;
    }

    if (action) {
      where.action = action;
    }

    if (practiceId) {
      where.practiceId = practiceId;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.createdAt = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.createdAt = {
        lte: new Date(endDate),
      };
    }

    // Get activity logs with pagination
    const [logs, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          practice: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.status(200).json({
      logs,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error("Get activity logs error:", error);
    res.status(500).json({ message: "Failed to retrieve activity logs" });
  }
};
