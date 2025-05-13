// src/services/file.service.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { promisify } = require("util");
const sharp = require("sharp");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const logger = require("../utils/logger");

// Promisify file system operations
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

/**
 * File Service - Handles file uploads and management
 */
class FileService {
  constructor() {
    // Base upload directory
    this.uploadDir = path.join(process.cwd(), "uploads");

    // Ensure upload directories exist
    this.ensureDirectoriesExist();

    // Allowed file types
    this.allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    this.allowedDocumentTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
    ];
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectoriesExist() {
    try {
      // Create base uploads directory if it doesn't exist
      await this.createDirectoryIfNotExists(this.uploadDir);

      // Create subdirectories
      await Promise.all([
        this.createDirectoryIfNotExists(path.join(this.uploadDir, "practices")),
        this.createDirectoryIfNotExists(path.join(this.uploadDir, "doctors")),
        this.createDirectoryIfNotExists(path.join(this.uploadDir, "patients")),
        this.createDirectoryIfNotExists(path.join(this.uploadDir, "documents")),
      ]);
    } catch (error) {
      logger.error(`Failed to create upload directories: ${error.message}`);
    }
  }

  /**
   * Create directory if it doesn't exist
   * @param {string} dirPath - Directory path
   */
  async createDirectoryIfNotExists(dirPath) {
    try {
      await access(dirPath, fs.constants.F_OK);
    } catch (error) {
      // Directory doesn't exist, create it
      await mkdir(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Generate a unique filename
   * @param {string} originalName - Original file name
   * @returns {string} - Unique filename
   */
  generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    const extension = path.extname(originalName).toLowerCase();

    return `${timestamp}-${random}${extension}`;
  }

  /**
   * Validate file type
   * @param {string} mimetype - File MIME type
   * @param {Array} allowedTypes - Allowed MIME types
   * @returns {boolean} - Is valid
   */
  validateFileType(mimetype, allowedTypes) {
    return allowedTypes.includes(mimetype);
  }

  /**
   * Save practice logo
   * @param {Object} file - File object
   * @param {string} practiceId - Practice ID
   * @returns {Promise<string>} - File path
   */
  async savePracticeLogo(file, practiceId) {
    try {
      if (!this.validateFileType(file.mimetype, this.allowedImageTypes)) {
        throw new Error("Invalid file type. Only image files are allowed");
      }

      // Create practice directory if it doesn't exist
      const practiceDir = path.join(this.uploadDir, "practices", practiceId);
      await this.createDirectoryIfNotExists(practiceDir);

      // Generate unique filename
      const filename = this.generateUniqueFilename(file.originalname);
      const filepath = path.join(practiceDir, filename);

      // Resize and optimize the image
      await sharp(file.buffer)
        .resize({
          width: 500,
          height: 500,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(filepath);

      // Return relative path for database storage
      const relativePath = `uploads/practices/${practiceId}/${filename}`;

      // Update practice with new logo
      await prisma.practice.update({
        where: { id: practiceId },
        data: { logo: relativePath },
      });

      return relativePath;
    } catch (error) {
      logger.error(`Failed to save practice logo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save doctor image
   * @param {Object} file - File object
   * @param {string} doctorId - Doctor ID
   * @returns {Promise<string>} - File path
   */
  async saveDoctorImage(file, doctorId) {
    try {
      if (!this.validateFileType(file.mimetype, this.allowedImageTypes)) {
        throw new Error("Invalid file type. Only image files are allowed");
      }

      // Get doctor to find practice ID
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { practiceId: true },
      });

      if (!doctor) {
        throw new Error("Doctor not found");
      }

      // Create directory structure
      const doctorDir = path.join(this.uploadDir, "doctors", doctor.practiceId);
      await this.createDirectoryIfNotExists(doctorDir);

      // Generate unique filename
      const filename = this.generateUniqueFilename(file.originalname);
      const filepath = path.join(doctorDir, filename);

      // Resize and optimize the image
      await sharp(file.buffer)
        .resize({
          width: 400,
          height: 400,
          fit: "cover",
        })
        .jpeg({ quality: 80 })
        .toFile(filepath);

      // Return relative path for database storage
      return `uploads/doctors/${doctor.practiceId}/${filename}`;
    } catch (error) {
      logger.error(`Failed to save doctor image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save patient image
   * @param {Object} file - File object
   * @param {string} practiceId - Practice ID
   * @returns {Promise<string>} - File path
   */
  async savePatientImage(file, practiceId) {
    try {
      if (!this.validateFileType(file.mimetype, this.allowedImageTypes)) {
        throw new Error("Invalid file type. Only image files are allowed");
      }

      // Create directory structure
      const patientDir = path.join(this.uploadDir, "patients", practiceId);
      await this.createDirectoryIfNotExists(patientDir);

      // Generate unique filename
      const filename = this.generateUniqueFilename(file.originalname);
      const filepath = path.join(patientDir, filename);

      // Resize and optimize the image
      await sharp(file.buffer)
        .resize({
          width: 300,
          height: 300,
          fit: "cover",
        })
        .jpeg({ quality: 80 })
        .toFile(filepath);

      // Return relative path for database storage
      return `uploads/patients/${practiceId}/${filename}`;
    } catch (error) {
      logger.error(`Failed to save patient image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save medical document
   * @param {Object} file - File object
   * @param {string} patientId - Patient ID
   * @param {string} practiceId - Practice ID
   * @param {string} documentType - Document type (e.g., 'MEDICAL_RECORD', 'LAB_RESULT')
   * @param {string} description - Document description
   * @returns {Promise<Object>} - Saved document
   */
  async saveMedicalDocument(
    file,
    patientId,
    practiceId,
    documentType,
    description
  ) {
    try {
      // Check if file type is allowed
      const isImage = this.validateFileType(
        file.mimetype,
        this.allowedImageTypes
      );
      const isDocument = this.validateFileType(
        file.mimetype,
        this.allowedDocumentTypes
      );

      if (!isImage && !isDocument) {
        throw new Error(
          "Invalid file type. Only images and common document formats are allowed"
        );
      }

      // Create document directory
      const documentsDir = path.join(this.uploadDir, "documents", practiceId);
      await this.createDirectoryIfNotExists(documentsDir);

      // Generate unique filename
      const filename = this.generateUniqueFilename(file.originalname);
      const filepath = path.join(documentsDir, filename);

      // If it's an image, resize and optimize
      if (isImage) {
        await sharp(file.buffer)
          .resize({
            width: 1200,
            height: 1200,
            fit: "inside",
            withoutEnlargement: true,
          })
          .toFile(filepath);
      } else {
        // Save regular document
        fs.writeFileSync(filepath, file.buffer);
      }

      // Calculate file size
      const stats = fs.statSync(filepath);
      const fileSizeKB = Math.round(stats.size / 1024);

      // Return relative path for database storage
      const relativePath = `uploads/documents/${practiceId}/${filename}`;

      // Save document metadata in database
      const document = await prisma.patientDocument.create({
        data: {
          patientId,
          practiceId,
          filename: file.originalname,
          filePath: relativePath,
          fileType: file.mimetype,
          fileSize: fileSizeKB,
          documentType,
          description,
          uploadedAt: new Date(),
        },
      });

      return document;
    } catch (error) {
      logger.error(`Failed to save medical document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get document by ID
   * @param {string} documentId - Document ID
   * @param {string} practiceId - Practice ID (for access control)
   * @returns {Promise<Object>} - Document data
   */
  async getDocumentById(documentId, practiceId) {
    try {
      const document = await prisma.patientDocument.findFirst({
        where: {
          id: documentId,
          practiceId,
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!document) {
        throw new Error("Document not found");
      }

      // Check if file exists
      const filePath = path.join(process.cwd(), document.filePath);
      await access(filePath, fs.constants.F_OK);

      return {
        ...document,
        absolutePath: filePath,
      };
    } catch (error) {
      logger.error(`Failed to get document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get documents for a patient
   * @param {string} patientId - Patient ID
   * @param {string} practiceId - Practice ID (for access control)
   * @returns {Promise<Array>} - List of documents
   */
  async getPatientDocuments(patientId, practiceId) {
    try {
      const documents = await prisma.patientDocument.findMany({
        where: {
          patientId,
          practiceId,
        },
        orderBy: {
          uploadedAt: "desc",
        },
      });

      return documents;
    } catch (error) {
      logger.error(`Failed to get patient documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete document
   * @param {string} documentId - Document ID
   * @param {string} practiceId - Practice ID (for access control)
   * @returns {Promise<boolean>} - Success status
   */
  async deleteDocument(documentId, practiceId) {
    try {
      const document = await prisma.patientDocument.findFirst({
        where: {
          id: documentId,
          practiceId,
        },
      });

      if (!document) {
        throw new Error("Document not found");
      }

      // Delete file from disk
      const filePath = path.join(process.cwd(), document.filePath);
      try {
        await access(filePath, fs.constants.F_OK);
        await unlink(filePath);
      } catch (error) {
        logger.warn(`File not found on disk: ${filePath}`);
        // Continue deletion from database even if file is not found
      }

      // Delete from database
      await prisma.patientDocument.delete({
        where: { id: documentId },
      });

      return true;
    } catch (error) {
      logger.error(`Failed to delete document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete file by path
   * @param {string} filePath - Relative file path
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      try {
        await access(fullPath, fs.constants.F_OK);
        await unlink(fullPath);
        return true;
      } catch (error) {
        logger.warn(`File not found: ${fullPath}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to delete file: ${error.message}`);
      return false;
    }
  }

  /**
   * Get file stream
   * @param {string} filePath - Relative file path
   * @returns {Promise<ReadStream>} - File stream
   */
  async getFileStream(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      await access(fullPath, fs.constants.F_OK);
      return fs.createReadStream(fullPath);
    } catch (error) {
      logger.error(`Failed to get file stream: ${error.message}`);
      throw new Error("File not found");
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - Relative file path
   * @returns {Promise<boolean>} - File exists
   */
  async fileExists(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      await access(fullPath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file size
   * @param {string} filePath - Relative file path
   * @returns {Promise<number>} - File size in bytes
   */
  async getFileSize(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const stats = await fs.promises.stat(fullPath);
      return stats.size;
    } catch (error) {
      logger.error(`Failed to get file size: ${error.message}`);
      throw new Error("File not found");
    }
  }

  /**
   * Create temporary pre-signed URL for file download/viewing
   * This is a simplified version - in production, use S3 presigned URLs or similar
   * @param {string} filePath - Relative file path
   * @param {number} expiresIn - Expiration time in seconds (default 1 hour)
   * @returns {Promise<string>} - Temporary URL
   */
  async createTempUrl(filePath, expiresIn = 3600) {
    try {
      // Check if file exists
      if (!(await this.fileExists(filePath))) {
        throw new Error("File not found");
      }

      // Generate token with expiry
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + expiresIn * 1000);

      // Store token in database
      await prisma.fileAccessToken.create({
        data: {
          token,
          filePath,
          expiresAt: expiry,
        },
      });

      // Return URL with token
      // Note: In a real implementation, use proper URL construction with base URL
      return `/api/files/download?token=${token}`;
    } catch (error) {
      logger.error(`Failed to create temp URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate file access token
   * @param {string} token - Access token
   * @returns {Promise<string|null>} - File path if valid, null otherwise
   */
  async validateFileAccessToken(token) {
    try {
      // Find token in database
      const accessToken = await prisma.fileAccessToken.findUnique({
        where: { token },
      });

      // Check if token exists and is not expired
      if (!accessToken || accessToken.expiresAt < new Date()) {
        return null;
      }

      // Delete token after use for security
      await prisma.fileAccessToken.delete({
        where: { token },
      });

      return accessToken.filePath;
    } catch (error) {
      logger.error(`Failed to validate file token: ${error.message}`);
      return null;
    }
  }

  /**
   * Clean up expired file access tokens
   * @returns {Promise<number>} - Number of deleted tokens
   */
  async cleanupExpiredTokens() {
    try {
      const result = await prisma.fileAccessToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return result.count;
    } catch (error) {
      logger.error(`Failed to clean up expired tokens: ${error.message}`);
      return 0;
    }
  }
}

module.exports = new FileService();
