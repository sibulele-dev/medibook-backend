const { PrismaClient } = require("@prisma/client");
const slugify = require("slugify");
const { NotFoundError, ForbiddenError } = require("../utils/errors");
const fileService = require("./file.service");

const prisma = new PrismaClient();

/**
 * Service for managing medical practices
 */
class PracticeService {
  /**
   * Create a new practice
   * @param {Object} practiceData - Practice data
   * @param {string} practiceData.name - Practice name
   * @param {string} practiceData.address - Practice address
   * @param {string} practiceData.city - Practice city
   * @param {string} practiceData.state - Practice state/province
   * @param {string} practiceData.postalCode - Practice postal code
   * @param {string} practiceData.country - Practice country
   * @param {string} practiceData.phone - Practice phone number
   * @param {string} practiceData.email - Practice email
   * @param {string} practiceData.website - Practice website
   * @param {string} practiceData.description - Practice description
   * @param {Object} [file] - Practice logo file
   * @param {string} createdByUserId - ID of user creating the practice
   * @returns {Promise<Object>} Created practice
   */
  async createPractice(practiceData, file, createdByUserId) {
    const {
      name,
      address,
      city,
      state,
      postalCode,
      country,
      phone,
      email,
      website,
      description,
    } = practiceData;

    // Generate a unique slug from the practice name
    let slug = slugify(name, { lower: true, strict: true });

    // Check if slug already exists
    const existingPracticeWithSlug = await prisma.practice.findUnique({
      where: { slug },
    });

    // If slug exists, append a random string to make it unique
    if (existingPracticeWithSlug) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // Upload logo if provided
    let logoUrl = null;
    if (file) {
      logoUrl = await fileService.uploadPracticeLogo(file, slug);
    }

    // Create practice
    const practice = await prisma.practice.create({
      data: {
        name,
        slug,
        address,
        city,
        state,
        postalCode,
        country,
        phone,
        email,
        website,
        description,
        logoUrl,
        createdBy: {
          connect: { id: createdByUserId },
        },
        users: {
          connect: { id: createdByUserId }, // Add creator as a practice user
        },
      },
    });

    return practice;
  }

  /**
   * Get all practices
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.search - Search term for name, city, etc.
   * @returns {Promise<Object>} Practices and pagination metadata
   */
  async getAllPractices(options = {}) {
    const { page = 1, limit = 10, search = "" } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { state: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    // Get practices with pagination
    const [practices, totalCount] = await Promise.all([
      prisma.practice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              doctors: true,
              appointments: true,
            },
          },
        },
      }),
      prisma.practice.count({ where }),
    ]);

    return {
      practices,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get a practice by ID
   * @param {string} id - Practice ID
   * @returns {Promise<Object>} Practice
   */
  async getPracticeById(id) {
    const practice = await prisma.practice.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            doctors: true,
            appointments: true,
            patients: true,
          },
        },
      },
    });

    if (!practice) {
      throw new NotFoundError(`Practice with ID ${id} not found`);
    }

    return practice;
  }

  /**
   * Get a practice by slug
   * @param {string} slug - Practice slug
   * @returns {Promise<Object>} Practice
   */
  async getPracticeBySlug(slug) {
    const practice = await prisma.practice.findUnique({
      where: { slug },
      include: {
        services: true,
        businessHours: true,
        _count: {
          select: {
            doctors: true,
          },
        },
      },
    });

    if (!practice) {
      throw new NotFoundError(`Practice with slug ${slug} not found`);
    }

    return practice;
  }

  /**
   * Update a practice
   * @param {string} id - Practice ID
   * @param {Object} practiceData - Updated practice data
   * @param {Object} [file] - Updated practice logo
   * @param {string} userId - ID of user updating the practice
   * @returns {Promise<Object>} Updated practice
   */
  async updatePractice(id, practiceData, file, userId) {
    // Check if practice exists
    const practice = await this.getPracticeById(id);

    // If name is being updated, update slug
    let slug = practice.slug;
    if (practiceData.name && practiceData.name !== practice.name) {
      slug = slugify(practiceData.name, { lower: true, strict: true });

      // Check if new slug already exists (excluding current practice)
      const existingPracticeWithSlug = await prisma.practice.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      });

      // If slug exists, append a random string to make it unique
      if (existingPracticeWithSlug) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
      }
    }

    // Upload new logo if provided
    let logoUrl = practice.logoUrl;
    if (file) {
      logoUrl = await fileService.uploadPracticeLogo(file, slug);

      // Delete old logo if it exists
      if (practice.logoUrl) {
        await fileService.deleteFile(practice.logoUrl);
      }
    }

    // Update practice
    const updatedPractice = await prisma.practice.update({
      where: { id },
      data: {
        ...practiceData,
        slug,
        logoUrl,
        updatedAt: new Date(),
      },
    });

    return updatedPractice;
  }

  /**
   * Delete a practice
   * @param {string} id - Practice ID
   * @param {string} userId - ID of user deleting the practice
   * @returns {Promise<void>}
   */
  async deletePractice(id, userId) {
    // Check if practice exists
    const practice = await this.getPracticeById(id);

    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Only super admins can delete practices
    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Only super admins can delete practices");
    }

    // Delete practice logo if it exists
    if (practice.logoUrl) {
      await fileService.deleteFile(practice.logoUrl);
    }

    // Delete practice
    await prisma.practice.delete({
      where: { id },
    });
  }

  /**
   * Update practice business hours
   * @param {string} practiceId - Practice ID
   * @param {Array} businessHours - Business hours data
   * @returns {Promise<Object>} Updated practice with business hours
   */
  async updateBusinessHours(practiceId, businessHours) {
    // Check if practice exists
    await this.getPracticeById(practiceId);

    // Delete existing business hours
    await prisma.businessHours.deleteMany({
      where: { practiceId },
    });

    // Create new business hours
    await prisma.businessHours.createMany({
      data: businessHours.map((hours) => ({
        ...hours,
        practiceId,
      })),
    });

    // Return updated practice with business hours
    return prisma.practice.findUnique({
      where: { id: practiceId },
      include: { businessHours: true },
    });
  }

  /**
   * Get practices for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Practices the user has access to
   */
  async getUserPractices(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        practices: true,
      },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Super admins have access to all practices
    if (user.role === "SUPER_ADMIN") {
      return prisma.practice.findMany({
        orderBy: { name: "asc" },
      });
    }

    return user.practices;
  }
}

module.exports = new PracticeService();
