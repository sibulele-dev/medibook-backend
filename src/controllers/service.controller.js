/**
 * Service Controller
 * Handles API requests for medical services management
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { BadRequestError, NotFoundError } = require("../utils/errors");
const fileService = require("../services/file.service");

/**
 * Get all services for a practice
 */
exports.getServices = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { categoryId, active, page = 1, limit = 50 } = req.query;

    // Build filter object
    const filter = { practiceId };

    if (categoryId) filter.categoryId = categoryId;
    if (active !== undefined) filter.active = active === "true";

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get services with categories
    const services = await prisma.service.findMany({
      where: filter,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          category: {
            name: "asc",
          },
        },
        { name: "asc" },
      ],
      skip,
      take: Number(limit),
    });

    // Get total count for pagination
    const totalCount = await prisma.service.count({ where: filter });

    res.json({
      data: services,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a service by ID
 */
exports.getServiceById = async (req, res, next) => {
  try {
    const { practiceId, serviceId } = req.params;

    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
        practiceId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundError("Service not found");
    }

    res.json({ data: service });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new service
 */
exports.createService = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const {
      name,
      description,
      durationMinutes,
      price,
      categoryId,
      color,
      active = true,
      allowOnlineBooking = true,
    } = req.body;

    // Validate required fields
    if (!name || !durationMinutes) {
      throw new BadRequestError("Name and duration are required");
    }

    // Handle icon upload if provided
    let iconUrl = null;
    if (req.file) {
      iconUrl = await fileService.saveServiceIcon(req.file, practiceId);
    }

    // Create service
    const service = await prisma.service.create({
      data: {
        practiceId,
        name,
        description,
        durationMinutes: Number(durationMinutes),
        price: price ? Number(price) : null,
        categoryId,
        iconUrl,
        color,
        active,
        allowOnlineBooking,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ data: service });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a service
 */
exports.updateService = async (req, res, next) => {
  try {
    const { practiceId, serviceId } = req.params;
    const {
      name,
      description,
      durationMinutes,
      price,
      categoryId,
      color,
      active,
      allowOnlineBooking,
    } = req.body;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: {
        id: serviceId,
        practiceId,
      },
    });

    if (!existingService) {
      throw new NotFoundError("Service not found");
    }

    // Handle icon upload if provided
    let iconUrl = undefined;
    if (req.file) {
      // Delete old icon if exists
      if (existingService.iconUrl) {
        await fileService.deleteFile(existingService.iconUrl);
      }

      iconUrl = await fileService.saveServiceIcon(req.file, practiceId);
    }

    // Update service
    const service = await prisma.service.update({
      where: {
        id: serviceId,
      },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        durationMinutes:
          durationMinutes !== undefined ? Number(durationMinutes) : undefined,
        price: price !== undefined ? (price ? Number(price) : null) : undefined,
        categoryId: categoryId !== undefined ? categoryId || null : undefined,
        iconUrl: iconUrl !== undefined ? iconUrl : undefined,
        color: color !== undefined ? color : undefined,
        active:
          active !== undefined
            ? active === true || active === "true"
            : undefined,
        allowOnlineBooking:
          allowOnlineBooking !== undefined
            ? allowOnlineBooking === true || allowOnlineBooking === "true"
            : undefined,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ data: service });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a service
 */
exports.deleteService = async (req, res, next) => {
  try {
    const { practiceId, serviceId } = req.params;

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
        practiceId,
      },
    });

    if (!service) {
      throw new NotFoundError("Service not found");
    }

    // Check if service is used in any appointments
    const appointmentCount = await prisma.appointment.count({
      where: {
        serviceId,
        practiceId,
      },
    });

    if (appointmentCount > 0) {
      // If service is used, just mark it as inactive instead of deleting
      await prisma.service.update({
        where: {
          id: serviceId,
        },
        data: {
          active: false,
          allowOnlineBooking: false,
        },
      });

      return res.json({
        message: `Service has ${appointmentCount} appointments. It has been deactivated instead of deleted.`,
      });
    }

    // Delete service icon if exists
    if (service.iconUrl) {
      await fileService.deleteFile(service.iconUrl);
    }

    // Delete the service
    await prisma.service.delete({
      where: {
        id: serviceId,
      },
    });

    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all service categories
 */
exports.getServiceCategories = async (req, res, next) => {
  try {
    const { practiceId } = req.params;

    const categories = await prisma.serviceCategory.findMany({
      where: {
        practiceId,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Count services in each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await prisma.service.count({
          where: {
            categoryId: category.id,
            practiceId,
          },
        });

        return {
          ...category,
          serviceCount: count,
        };
      })
    );

    res.json({ data: categoriesWithCounts });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a service category
 */
exports.createServiceCategory = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { name, description, color } = req.body;

    if (!name) {
      throw new BadRequestError("Name is required");
    }

    const category = await prisma.serviceCategory.create({
      data: {
        practiceId,
        name,
        description,
        color,
      },
    });

    res.status(201).json({ data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a service category
 */
exports.updateServiceCategory = async (req, res, next) => {
  try {
    const { practiceId, categoryId } = req.params;
    const { name, description, color } = req.body;

    // Check if category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: {
        id: categoryId,
        practiceId,
      },
    });

    if (!existingCategory) {
      throw new NotFoundError("Category not found");
    }

    // Update category
    const category = await prisma.serviceCategory.update({
      where: {
        id: categoryId,
      },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        color: color !== undefined ? color : undefined,
      },
    });

    res.json({ data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a service category
 */
exports.deleteServiceCategory = async (req, res, next) => {
  try {
    const { practiceId, categoryId } = req.params;

    // Check if category exists
    const category = await prisma.serviceCategory.findUnique({
      where: {
        id: categoryId,
        practiceId,
      },
    });

    if (!category) {
      throw new NotFoundError("Category not found");
    }

    // Check if category has services
    const serviceCount = await prisma.service.count({
      where: {
        categoryId,
        practiceId,
      },
    });

    if (serviceCount > 0) {
      throw new BadRequestError(
        `Cannot delete category with ${serviceCount} services`
      );
    }

    // Delete the category
    await prisma.serviceCategory.delete({
      where: {
        id: categoryId,
      },
    });

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Get doctor-service associations
 */
exports.getDoctorServices = async (req, res, next) => {
  try {
    const { practiceId, doctorId } = req.params;

    // Get doctor's services
    const doctorServices = await prisma.doctorService.findMany({
      where: {
        doctorId,
        service: {
          practiceId,
        },
      },
      include: {
        service: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({ data: doctorServices });
  } catch (error) {
    next(error);
  }
};

/**
 * Update doctor-service associations
 */
exports.updateDoctorServices = async (req, res, next) => {
  try {
    const { practiceId, doctorId } = req.params;
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds)) {
      throw new BadRequestError("serviceIds must be an array");
    }

    // Verify that all services belong to the practice
    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
        practiceId,
      },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestError(
        "One or more services do not belong to this practice"
      );
    }

    // Verify doctor exists and belongs to practice
    const doctor = await prisma.doctor.findUnique({
      where: {
        id: doctorId,
        practiceId,
      },
    });

    if (!doctor) {
      throw new NotFoundError("Doctor not found");
    }

    // Get current doctor-service associations
    const existingAssociations = await prisma.doctorService.findMany({
      where: {
        doctorId,
      },
    });

    const existingServiceIds = existingAssociations.map((a) => a.serviceId);

    // Determine which to add and which to remove
    const toAdd = serviceIds.filter((id) => !existingServiceIds.includes(id));
    const toRemove = existingServiceIds.filter(
      (id) => !serviceIds.includes(id)
    );

    // Perform the update in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove associations
      if (toRemove.length > 0) {
        await tx.doctorService.deleteMany({
          where: {
            doctorId,
            serviceId: {
              in: toRemove,
            },
          },
        });
      }

      // Add new associations
      for (const serviceId of toAdd) {
        await tx.doctorService.create({
          data: {
            doctorId,
            serviceId,
          },
        });
      }
    });

    // Get updated associations
    const updatedAssociations = await prisma.doctorService.findMany({
      where: {
        doctorId,
      },
      include: {
        service: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({
      data: updatedAssociations,
      message: "Doctor services updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get services that can be booked online
 */
exports.getBookableServices = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { doctorId } = req.query;

    let services;

    if (doctorId) {
      // Get services for specific doctor
      services = await prisma.service.findMany({
        where: {
          practiceId,
          active: true,
          allowOnlineBooking: true,
          doctorServices: {
            some: {
              doctorId,
            },
          },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            category: {
              name: "asc",
            },
          },
          { name: "asc" },
        ],
      });
    } else {
      // Get all bookable services
      services = await prisma.service.findMany({
        where: {
          practiceId,
          active: true,
          allowOnlineBooking: true,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            category: {
              name: "asc",
            },
          },
          { name: "asc" },
        ],
      });
    }

    // Group services by category
    const servicesByCategory = services.reduce((acc, service) => {
      const categoryId = service.categoryId || "uncategorized";
      const categoryName = service.category?.name || "Uncategorized";

      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          name: categoryName,
          services: [],
        };
      }

      acc[categoryId].services.push(service);

      return acc;
    }, {});

    res.json({
      data: Object.values(servicesByCategory),
    });
  } catch (error) {
    next(error);
  }
};
