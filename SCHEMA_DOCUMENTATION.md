# Database Schema Documentation

This document describes all the database schemas used in the Doctors application, modeled after the frontend forms and application requirements.

## Table of Contents

1. [Users Schema](#users-schema)
2. [Doctors Schema](#doctors-schema)
3. [Practices Schema](#practices-schema)
4. [Practice Doctors Schema](#practice-doctors-schema)
5. [Login Attempts Schema](#login-attempts-schema)
6. [Redis Storage](#redis-storage)

## Users Schema

**File:** `backend/src/schema/user.js`

The base user table that stores authentication and basic user information.

### Fields

| Field           | Type        | Description                    | Required             |
| --------------- | ----------- | ------------------------------ | -------------------- |
| `id`            | `text`      | Primary key (nanoid)           | Yes                  |
| `email`         | `text`      | User email (unique)            | Yes                  |
| `password`      | `text`      | Hashed password                | Yes                  |
| `firstName`     | `text`      | User's first name              | Yes                  |
| `lastName`      | `text`      | User's last name               | Yes                  |
| `role`          | `enum`      | User role: 'doctor' or 'admin' | Yes                  |
| `isActive`      | `boolean`   | Account active status          | Yes (default: true)  |
| `emailVerified` | `boolean`   | Email verification status      | Yes (default: false) |
| `createdAt`     | `timestamp` | Account creation date          | Yes                  |
| `updatedAt`     | `timestamp` | Last update date               | Yes                  |

### Usage

- Base table for all users (admins and doctors)
- Role determines access levels and functionality
- Email verification required for full access

## Doctors Schema

**File:** `backend/src/schema/doctor.js`

Extends the user table with doctor-specific information, based on the DoctorForm.jsx.

### Fields

| Field            | Type        | Description               | Required            |
| ---------------- | ----------- | ------------------------- | ------------------- |
| `id`             | `text`      | Primary key (nanoid)      | Yes                 |
| `userId`         | `text`      | Reference to users.id     | Yes                 |
| `specialization` | `text`      | Medical specialization    | Yes                 |
| `phoneNumber`    | `text`      | Doctor's phone number     | Yes                 |
| `practiceId`     | `text`      | Reference to practices.id | Yes                 |
| `licenseNumber`  | `text`      | Medical license number    | No                  |
| `experience`     | `text`      | Years of experience       | No                  |
| `bio`            | `text`      | Doctor biography          | No                  |
| `isActive`       | `boolean`   | Doctor active status      | Yes (default: true) |
| `createdAt`      | `timestamp` | Record creation date      | Yes                 |
| `updatedAt`      | `timestamp` | Last update date          | Yes                 |

### Specializations

The system supports the following medical specializations:

- General Practice
- Cardiology
- Dermatology
- Endocrinology
- Gastroenterology
- Neurology
- Oncology
- Orthopedics
- Pediatrics
- Psychiatry
- Radiology
- Surgery
- Urology
- Gynecology
- Ophthalmology
- ENT (Ear, Nose, Throat)
- Pulmonology
- Rheumatology
- Emergency Medicine
- Family Medicine
- Internal Medicine
- Obstetrics
- Pathology
- Anesthesiology
- Physical Therapy
- Dental
- Veterinary
- Alternative Medicine
- Sports Medicine
- Geriatrics

### Usage

- One-to-one relationship with users table
- Only users with role 'doctor' should have doctor records
- Required for doctor-specific functionality

## Practices Schema

**File:** `backend/src/schema/practice.js`

Stores medical practice information, based on the PracticeForm.jsx.

### Fields

| Field       | Type        | Description           | Required                |
| ----------- | ----------- | --------------------- | ----------------------- |
| `id`        | `text`      | Primary key           | Yes                     |
| `name`      | `text`      | Practice name         | Yes                     |
| `address`   | `text`      | Practice address      | Yes                     |
| `phone`     | `text`      | Practice phone number | Yes                     |
| `status`    | `text`      | Practice status       | Yes (default: 'active') |
| `createdAt` | `timestamp` | Record creation date  | Yes                     |
| `updatedAt` | `timestamp` | Last update date      | Yes                     |

### Status Values

- `active` - Practice is operational
- `inactive` - Practice is temporarily closed

### Usage

- Medical practices where doctors work
- Referenced by doctors table
- Can have multiple doctors (many-to-many relationship)

## Practice Doctors Schema

**File:** `backend/src/schema/practiceDoctor.js`

Join table for many-to-many relationship between practices and doctors.

### Fields

| Field        | Type   | Description               | Required |
| ------------ | ------ | ------------------------- | -------- |
| `practiceId` | `text` | Reference to practices.id | Yes      |
| `doctorId`   | `text` | Reference to users.id     | Yes      |

### Usage

- Enables doctors to work at multiple practices
- Enables practices to have multiple doctors
- Primary key is composite of practiceId and doctorId

## Login Attempts Schema

**File:** `backend/src/schema/loginAttempt.js`

Tracks failed login attempts for security.

### Fields

| Field           | Type        | Description               | Required         |
| --------------- | ----------- | ------------------------- | ---------------- |
| `id`            | `text`      | Primary key               | Yes              |
| `email`         | `text`      | User email (unique)       | Yes              |
| `attempts`      | `integer`   | Number of failed attempts | Yes (default: 0) |
| `lastAttemptAt` | `timestamp` | Last attempt timestamp    | Yes              |
| `lockedUntil`   | `timestamp` | Account lock expiration   | No               |
| `createdAt`     | `timestamp` | Record creation date      | Yes              |
| `updatedAt`     | `timestamp` | Last update date          | Yes              |

### Usage

- Prevents brute force attacks
- Locks accounts after multiple failed attempts
- Automatic unlock after time period

## Redis Storage

**Note:** The following data is stored in Redis, not in the main database:

### Refresh Tokens

- **Purpose**: JWT refresh token authentication
- **Storage**: Redis with expiration
- **Fields**: token, userId, expiresAt, isRevoked
- **Usage**: Secure token refresh mechanism

### User Sessions

- **Purpose**: Active user session management
- **Storage**: Redis with expiration
- **Fields**: sessionToken, userId, expiresAt, isActive, ipAddress, userAgent
- **Usage**: Session tracking and security

### Benefits of Redis Storage

- **Performance**: Fast in-memory access
- **Expiration**: Automatic cleanup of expired data
- **Scalability**: Can be distributed across multiple instances
- **Security**: Separate from main database for sensitive session data

## Relationships

### One-to-One Relationships

- `users` ↔ `doctors` (via `doctors.userId`)

### One-to-Many Relationships

- `practices` → `doctors` (via `doctors.practiceId`)

### Many-to-Many Relationships

- `practices` ↔ `doctors` (via `practiceDoctors` table)

## Form Integration

### PracticeForm.jsx Fields

- `name` → `practices.name`
- `address` → `practices.address`
- `phone` → `practices.phone`
- `status` → `practices.status`
- `doctor.firstName` → `users.firstName`
- `doctor.lastName` → `users.lastName`
- `doctor.email` → `users.email`
- `doctor.phone` → `doctors.phoneNumber`
- `doctor.specialization` → `doctors.specialization`

### DoctorForm.jsx Fields

- `firstName` → `users.firstName`
- `lastName` → `users.lastName`
- `email` → `users.email`
- `password` → `users.password`
- `specialization` → `doctors.specialization`
- `phoneNumber` → `doctors.phoneNumber`
- `practiceId` → `doctors.practiceId`

## Security Features

1. **Password Hashing**: All passwords are hashed before storage
2. **JWT Tokens**: Secure authentication with access and refresh tokens (stored in Redis)
3. **Session Management**: Redis-based session storage with automatic cleanup
4. **Login Protection**: Brute force protection with account locking
5. **Email Verification**: Required for full account access
6. **Role-Based Access**: Admin and doctor roles with different permissions

## Data Validation

Each schema includes validation functions:

- `validatePracticeData()` - Validates practice information
- `validateDoctorData()` - Validates doctor information
- Input sanitization and format checking
- Required field validation
- Business rule enforcement

## Migration Notes

When updating the database schema:

1. Run Drizzle migrations to update the database structure
2. Update any existing data to match new schema requirements
3. Test all form submissions with new schema
4. Verify all API endpoints work with updated schemas
