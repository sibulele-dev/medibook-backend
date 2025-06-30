const {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
} = require("drizzle-orm/pg-core");
const { nanoid } = require("nanoid");
const { users } = require("./user");
const { practices } = require("./practice");

// Doctor table schema - extends user with doctor-specific fields
const doctors = pgTable("doctors", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid(30)),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  specialization: text("specialization").notNull(),
  phoneNumber: text("phone_number").notNull(),
  practiceId: text("practice_id")
    .notNull()
    .references(() => practices.id),
  licenseNumber: text("license_number"),
  experience: text("experience"),
  bio: text("bio"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Common specializations
const SPECIALIZATIONS = [
  "General Practice",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Radiology",
  "Surgery",
  "Urology",
  "Gynecology",
  "Ophthalmology",
  "ENT (Ear, Nose, Throat)",
  "Pulmonology",
  "Rheumatology",
  "Emergency Medicine",
  "Family Medicine",
  "Internal Medicine",
  "Obstetrics",
  "Pathology",
  "Anesthesiology",
  "Physical Therapy",
  "Dental",
  "Veterinary",
  "Alternative Medicine",
  "Sports Medicine",
  "Geriatrics",
];

// Helper function to validate doctor data
const validateDoctorData = (data) => {
  const errors = [];

  if (!data.specialization || data.specialization.trim().length === 0) {
    errors.push("Specialization is required");
  } else if (!SPECIALIZATIONS.includes(data.specialization)) {
    errors.push("Invalid specialization");
  }

  if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
    errors.push("Phone number is required");
  }

  if (!data.practiceId || data.practiceId.trim().length === 0) {
    errors.push("Practice is required");
  }

  if (data.licenseNumber && data.licenseNumber.trim().length === 0) {
    errors.push("License number cannot be empty if provided");
  }

  return errors;
};

// Helper function to create doctor data
const createDoctorData = (data) => {
  return {
    id: data.id || nanoid(30),
    userId: data.userId,
    specialization: data.specialization.trim(),
    phoneNumber: data.phoneNumber.trim(),
    practiceId: data.practiceId,
    licenseNumber: data.licenseNumber?.trim() || null,
    experience: data.experience?.trim() || null,
    bio: data.bio?.trim() || null,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Helper function to update doctor data
const updateDoctorData = (data) => {
  const updateData = {};

  if (data.specialization !== undefined)
    updateData.specialization = data.specialization.trim();
  if (data.phoneNumber !== undefined)
    updateData.phoneNumber = data.phoneNumber.trim();
  if (data.practiceId !== undefined) updateData.practiceId = data.practiceId;
  if (data.licenseNumber !== undefined)
    updateData.licenseNumber = data.licenseNumber?.trim() || null;
  if (data.experience !== undefined)
    updateData.experience = data.experience?.trim() || null;
  if (data.bio !== undefined) updateData.bio = data.bio?.trim() || null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  updateData.updatedAt = new Date();

  return updateData;
};

module.exports = {
  doctors,
  SPECIALIZATIONS,
  validateDoctorData,
  createDoctorData,
  updateDoctorData,
};
