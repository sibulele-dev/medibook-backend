const {
  pgTable,
  text,
  timestamp,
  boolean,
  varchar,
} = require("drizzle-orm/pg-core");

// Practice table schema - based on PracticeForm.jsx
const practices = pgTable("practices", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country"),
  phone: text("phone").notNull(),
  status: text("status").default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Practice status enum
const practiceStatusEnum = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

// Helper function to validate practice data
const validatePracticeData = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push("Practice name is required");
  }

  if (!data.address || data.address.trim().length === 0) {
    errors.push("Practice address is required");
  }

  if (!data.phone || data.phone.trim().length === 0) {
    errors.push("Practice phone is required");
  }

  if (data.status && !Object.values(practiceStatusEnum).includes(data.status)) {
    errors.push("Invalid status");
  }

  return errors;
};

// Helper function to create practice data
const createPracticeData = (data) => {
  return {
    id: data.id || crypto.randomUUID(),
    name: data.name.trim(),
    address: data.address.trim(),
    city: data.city?.trim() || "",
    state: data.state?.trim() || "",
    zip: data.zip?.trim() || "",
    country: data.country?.trim() || "",
    phone: data.phone.trim(),
    status: data.status || "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Helper function to update practice data
const updatePracticeData = (data) => {
  const updateData = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.address !== undefined) updateData.address = data.address.trim();
  if (data.phone !== undefined) updateData.phone = data.phone.trim();
  if (data.status !== undefined) updateData.status = data.status;

  updateData.updatedAt = new Date();

  return updateData;
};

module.exports = {
  practices,
  practiceStatusEnum,
  validatePracticeData,
  createPracticeData,
  updatePracticeData,
};
