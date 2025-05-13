/**
 * Patient Service
 * Handles all business logic related to patients including CRUD operations,
 * appointment management, and document handling.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fileService = require("./file.service");
const notificationService = require("./notification.service");
const { createSlug } = require("../utils/slug");
const {
  NotFoundError,
  ValidationError,
  ConflictError,
} = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * Create a new patient
 * @param {Object} patientData - Patient information
 * @param {string} practiceId - ID of the practice
 * @returns {Promise<Object>} - The created patient
 */
async function createPatient(patientData, practiceId) {
  logger.info(`Creating new patient for practice ${practiceId}`);

  // Check if email already exists
  const existingPatient = await prisma.patient.findFirst({
    where: {
      email: patientData.email,
      practiceId,
    },
  });

  if (existingPatient) {
    throw new ConflictError("Patient with this email already exists");
  }

  // Create slug for patient
  const slug = createSlug(`${patientData.firstName}-${patientData.lastName}`);

  // Create patient record
  const patient = await prisma.patient.create({
    data: {
      ...patientData,
      slug,
      practiceId,
      // Set default preferences if not provided
      preferences: patientData.preferences || {
        communicationPreference: "email",
        reminderTime: 24, // hours before appointment
        marketingConsent: false,
      },
    },
  });

  // Create patient user account if requested
  if (patientData.createAccount) {
    await prisma.user.create({
      data: {
        email: patientData.email,
        role: "PATIENT",
        patientId: patient.id,
        practiceId,
      },
    });

    // Send welcome email with temporary password
    await notificationService.sendWelcomeEmail(
      patient.email,
      patient.firstName
    );
  }

  logger.info(`Patient created: ${patient.id}`);
  return patient;
}

/**
 * Get a patient by ID
 * @param {string} patientId - Patient ID
 * @param {string} practiceId - Practice ID
 * @returns {Promise<Object>} - Patient data
 */
async function getPatientById(patientId, practiceId) {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId,
    },
    include: {
      appointments: {
        include: {
          doctor: true,
          service: true,
        },
        orderBy: {
          scheduledTime: "desc",
        },
      },
      medicalRecords: true,
    },
  });

  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  return patient;
}

/**
 * Get patients for a practice with pagination and filtering
 * @param {string} practiceId - Practice ID
 * @param {Object} options - Query options (pagination, filtering, etc.)
 * @returns {Promise<Object>} - Paginated patients
 */
async function getPatients(practiceId, options = {}) {
  const {
    page = 1,
    pageSize = 10,
    search = "",
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Build filter conditions
  const where = {
    practiceId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  // Get total count for pagination
  const totalCount = await prisma.patient.count({ where });

  // Get patients
  const patients = await prisma.patient.findMany({
    where,
    include: {
      _count: {
        select: {
          appointments: true,
          medicalRecords: true,
        },
      },
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip,
    take,
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data: patients,
    meta: {
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

/**
 * Update a patient's information
 * @param {string} patientId - Patient ID
 * @param {Object} patientData - Updated patient data
 * @param {string} practiceId - Practice ID
 * @returns {Promise<Object>} - Updated patient
 */
async function updatePatient(patientId, patientData, practiceId) {
  // Check if patient exists
  const existingPatient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId,
    },
  });

  if (!existingPatient) {
    throw new NotFoundError("Patient not found");
  }

  // Check if email update causes conflict
  if (patientData.email && patientData.email !== existingPatient.email) {
    const emailConflict = await prisma.patient.findFirst({
      where: {
        email: patientData.email,
        practiceId,
        id: { not: patientId },
      },
    });

    if (emailConflict) {
      throw new ConflictError("A patient with this email already exists");
    }
  }

  // Update patient record
  const updatedPatient = await prisma.patient.update({
    where: { id: patientId },
    data: patientData,
    include: {
      appointments: {
        include: {
          doctor: true,
          service: true,
        },
        orderBy: {
          scheduledTime: "desc",
        },
        take: 5,
      },
    },
  });

  // Update user record if it exists
  const userAccount = await prisma.user.findFirst({
    where: {
      patientId,
      practiceId,
    },
  });

  if (userAccount && patientData.email) {
    await prisma.user.update({
      where: { id: userAccount.id },
      data: { email: patientData.email },
    });
  }

  logger.info(`Patient updated: ${patientId}`);
  return updatedPatient;
}

/**
 * Delete a patient
 * @param {string} patientId - Patient ID
 * @param {string} practiceId - Practice ID
 * @returns {Promise<Object>} - Deletion confirmation
 */
async function deletePatient(patientId, practiceId) {
  // Check if patient exists
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId,
    },
    include: {
      appointments: true,
    },
  });

  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  // Check for future appointments
  const futureAppointments = patient.appointments.filter(
    (app) => new Date(app.scheduledTime) > new Date()
  );

  if (futureAppointments.length > 0) {
    throw new ValidationError("Cannot delete patient with future appointments");
  }

  // Delete patient documents
  await fileService.deletePatientFiles(patientId);

  // Delete patient user account if exists
  await prisma.user.deleteMany({
    where: {
      patientId,
      practiceId,
    },
  });

  // Delete patient record
  await prisma.patient.delete({
    where: { id: patientId },
  });

  logger.info(`Patient deleted: ${patientId}`);
  return { success: true, message: "Patient deleted successfully" };
}

/**
 * Get patient appointments
 * @param {string} patientId - Patient ID
 * @param {string} practiceId - Practice ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Patient appointments
 */
async function getPatientAppointments(patientId, practiceId, options = {}) {
  const {
    status,
    from,
    to,
    limit = 10,
    page = 1,
    sortBy = "scheduledTime",
    sortOrder = "desc",
  } = options;

  const skip = (page - 1) * limit;

  // Build where conditions
  const where = {
    patientId,
    practiceId,
    ...(status && { status }),
    ...(from &&
      to && {
        scheduledTime: {
          gte: new Date(from),
          lte: new Date(to),
        },
      }),
    ...(from &&
      !to && {
        scheduledTime: {
          gte: new Date(from),
        },
      }),
    ...(!from &&
      to && {
        scheduledTime: {
          lte: new Date(to),
        },
      }),
  };

  // Get total count
  const totalCount = await prisma.appointment.count({ where });

  // Get appointments
  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: true,
      service: true,
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip,
    take: limit,
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data: appointments,
    meta: {
      totalCount,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

/**
 * Get patient medical records
 * @param {string} patientId - Patient ID
 * @param {string} practiceId - Practice ID
 * @returns {Promise<Array>} - Patient medical records
 */
async function getPatientMedicalRecords(patientId, practiceId) {
  // Check if patient exists
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId,
    },
  });

  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  // Get medical records
  const medicalRecords = await prisma.medicalRecord.findMany({
    where: {
      patientId,
      practiceId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      doctor: true,
    },
  });

  return medicalRecords;
}

/**
 * Upload patient document
 * @param {string} patientId - Patient ID
 * @param {string} practiceId - Practice ID
 * @param {Object} file - File object
 * @param {string} documentType - Document type (profile, medical, insurance, etc.)
 * @param {string} description - Document description
 * @returns {Promise<Object>} - Uploaded document info
 */
async function uploadPatientDocument(
  patientId,
  practiceId,
  file,
  documentType,
  description
) {
  // Check if patient exists
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId,
    },
  });

  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  // Upload document to appropriate folder
  const uploadPath = `patients/${patientId}/${documentType}`;
  const uploadedFile = await fileService.uploadFile(file, uploadPath);

  // Create document record
  const document = await prisma.patientDocument.create({
    data: {
      patientId,
      practiceId,
      type: documentType,
      description,
      filename: uploadedFile.filename,
      filesize: uploadedFile.size,
      mimeType: uploadedFile.mimetype,
      path: uploadedFile.path,
    },
  });

  logger.info(`Document uploaded for patient ${patientId}: ${document.id}`);
  return document;
}

/**
 * Get patient documents
 * @param {string} patientId - Patient ID
 * @param {string} practiceId - Practice ID
 * @param {string} documentType - Filter by document type (optional)
 * @returns {Promise<Array>} - Patient documents
 */
async function getPatientDocuments(patientId, practiceId, documentType) {
  // Check if patient exists
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId,
    },
  });

  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  // Get documents
  const documents = await prisma.patientDocument.findMany({
    where: {
      patientId,
      practiceId,
      ...(documentType && { type: documentType }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return documents;
}

/**
 * Delete patient document
 * @param {string} documentId - Document ID
 * @param {string} patientId - Patient ID
 * @param {string} practiceId - Practice ID
 * @returns {Promise<Object>} - Deletion confirmation
 */
async function deletePatientDocument(documentId, patientId, practiceId) {
  // Check if document exists
  const document = await prisma.patientDocument.findFirst({
    where: {
      id: documentId,
      patientId,
      practiceId,
    },
  });

  if (!document) {
    throw new NotFoundError("Document not found");
  }

  // Delete file from storage
  await fileService.deleteFile(document.path);

  // Delete document record
  await prisma.patientDocument.delete({
    where: { id: documentId },
  });

  logger.info(`Document deleted: ${documentId}`);
  return { success: true, message: "Document deleted successfully" };
}

/**
 * Update patient preferences
 * @param {string} patientId - Patient ID
 * @param {string} practiceId - Practice ID
 * @param {Object} preferences - Patient preferences
 * @returns {Promise<Object>} - Updated patient
 */
async function updatePatientPreferences(patientId, practiceId, preferences) {
  // Check if patient exists
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId,
    },
  });

  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  // Update patient preferences
  const updatedPatient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      preferences: {
        ...patient.preferences,
        ...preferences,
      },
    },
  });

  logger.info(`Patient preferences updated: ${patientId}`);
  return updatedPatient;
}

/**
 * Add patient medical history
 * @param {string} patientId - Patient ID
 * @param {string} practiceId - Practice ID
 * @param {Object} historyData - Medical history data
 * @returns {Promise<Object>} - Added medical history
 */
async function addPatientMedicalHistory(patientId, practiceId, historyData) {
  // Check if patient exists
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId,
    },
  });

  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  // Add medical history
  const medicalHistory = await prisma.medicalHistory.create({
    data: {
      ...historyData,
      patientId,
      practiceId,
    },
  });

  logger.info(
    `Medical history added for patient ${patientId}: ${medicalHistory.id}`
  );
  return medicalHistory;
}

/**
 * Get patient statistics
 * @param {string} practiceId - Practice ID
 * @returns {Promise<Object>} - Patient statistics
 */
async function getPatientStatistics(practiceId) {
  // Total patients
  const totalPatients = await prisma.patient.count({
    where: { practiceId },
  });

  // New patients in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newPatients = await prisma.patient.count({
    where: {
      practiceId,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Patients with appointments in the last 30 days
  const activePatients = await prisma.appointment.groupBy({
    by: ["patientId"],
    where: {
      practiceId,
      scheduledTime: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Patients by status
  const patientsByStatus = await prisma.patient.groupBy({
    by: ["status"],
    where: { practiceId },
    _count: true,
  });

  // Format status counts
  const statusCounts = {};
  patientsByStatus.forEach((item) => {
    statusCounts[item.status] = item._count;
  });

  return {
    totalPatients,
    newPatients,
    activePatients: activePatients.length,
    patientsByStatus: statusCounts,
  };
}

module.exports = {
  createPatient,
  getPatientById,
  getPatients,
  updatePatient,
  deletePatient,
  getPatientAppointments,
  getPatientMedicalRecords,
  uploadPatientDocument,
  getPatientDocuments,
  deletePatientDocument,
  updatePatientPreferences,
  addPatientMedicalHistory,
  getPatientStatistics,
};
