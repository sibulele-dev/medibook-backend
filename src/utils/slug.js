/**
 * Slug utility functions for generating and handling URL-friendly slugs
 */

/**
 * Generate a URL-friendly slug from a string
 * @param {String} text - Text to convert to slug
 * @returns {String} URL-friendly slug
 */
const generateSlug = (text) => {
  if (!text) return "";

  return text
    .toString() // Convert to string
    .normalize("NFD") // Normalize to decomposed form for handling accents
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics/accents
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from ends
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, "") // Remove all non-word characters except hyphens
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "") // Remove hyphens from start
    .replace(/-+$/, ""); // Remove hyphens from end
};

/**
 * Generate a unique slug by appending a number if the slug already exists
 * @param {String} baseSlug - The initial slug to make unique
 * @param {Function} checkExists - Async function that returns true if slug exists
 * @returns {Promise<String>} Unique slug
 */
const generateUniqueSlug = async (baseSlug, checkExists) => {
  let slug = baseSlug;
  let counter = 1;
  let exists = await checkExists(slug);

  // Keep incrementing counter until we find a slug that doesn't exist
  while (exists) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    exists = await checkExists(slug);
  }

  return slug;
};

/**
 * Generate a unique slug for a practice
 * @param {String} practiceName - Practice name
 * @param {Object} prisma - Prisma client instance
 * @returns {Promise<String>} Unique practice slug
 */
const generatePracticeSlug = async (practiceName, prisma) => {
  const baseSlug = generateSlug(practiceName);

  const checkExists = async (slug) => {
    const count = await prisma.practice.count({
      where: { slug },
    });
    return count > 0;
  };

  return generateUniqueSlug(baseSlug, checkExists);
};

/**
 * Generate a unique slug for a doctor
 * @param {String} firstName - Doctor's first name
 * @param {String} lastName - Doctor's last name
 * @param {String} specialization - Doctor's specialization (optional)
 * @param {Object} prisma - Prisma client instance
 * @returns {Promise<String>} Unique doctor slug
 */
const generateDoctorSlug = async (
  firstName,
  lastName,
  specialization = "",
  prisma
) => {
  let baseSlug = generateSlug(`${firstName}-${lastName}`);

  // Optionally include specialization in the slug for better uniqueness
  if (specialization) {
    baseSlug = `${baseSlug}-${generateSlug(specialization)}`;
  }

  const checkExists = async (slug) => {
    const count = await prisma.doctor.count({
      where: { slug },
    });
    return count > 0;
  };

  return generateUniqueSlug(baseSlug, checkExists);
};

/**
 * Generate a unique slug for a service
 * @param {String} serviceName - Service name
 * @param {String} practiceId - Practice ID (for scoping)
 * @param {Object} prisma - Prisma client instance
 * @returns {Promise<String>} Unique service slug
 */
const generateServiceSlug = async (serviceName, practiceId, prisma) => {
  const baseSlug = generateSlug(serviceName);

  const checkExists = async (slug) => {
    const count = await prisma.service.count({
      where: {
        slug,
        practiceId,
      },
    });
    return count > 0;
  };

  return generateUniqueSlug(baseSlug, checkExists);
};

/**
 * Parse a slug to extract information
 * Example: "dr-john-doe-cardiologist" -> { name: "john doe", specialization: "cardiologist" }
 * @param {String} slug - Slug to parse
 * @returns {Object} Extracted information
 */
const parseSlug = (slug) => {
  if (!slug) return {};

  // Handle doctor slugs (example formats: "dr-john-doe" or "dr-john-doe-cardiologist")
  if (slug.startsWith("dr-")) {
    const parts = slug.split("-");

    // Remove the "dr" prefix
    parts.shift();

    // If the last part might be a specialization (more sophisticated logic could be implemented)
    if (parts.length >= 3) {
      const specialization = parts.pop();
      const name = parts.join(" ");
      return { name, specialization };
    }

    return { name: parts.join(" ") };
  }

  // Handle practice or service slugs
  return { name: slug.replace(/-/g, " ") };
};

/**
 * Get simple slug for an object, using a property as the base
 * @param {Object} obj - The object to create a slug for
 * @param {String} property - The property to use as base for the slug
 * @returns {String} Generated slug
 */
const slugifyObject = (obj, property) => {
  if (!obj || !obj[property]) return "";
  return generateSlug(obj[property]);
};

module.exports = {
  generateSlug,
  generateUniqueSlug,
  generatePracticeSlug,
  generateDoctorSlug,
  generateServiceSlug,
  parseSlug,
  slugifyObject,
};
