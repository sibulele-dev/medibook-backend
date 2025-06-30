# Practice API Documentation

## Overview

The Practice API provides comprehensive management of medical practices in the MediBook system. All endpoints require admin authentication and are protected by JWT tokens.

## Base URL

```
http://localhost:3000/api/practices
```

## Authentication

All practice endpoints require admin authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get All Practices

**GET** `/api/practices`

Retrieves all practices with optional pagination and filtering.

#### Query Parameters

- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of practices per page (default: 10)
- `search` (optional): Search term for name, email, address, or specialization
- `status` (optional): Filter by status (active, inactive, pending)
- `specialization` (optional): Filter by specialization

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/practices?page=1&limit=5&search=cardiology" \
  -H "Authorization: Bearer <your-jwt-token>"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "practices": [
      {
        "id": "uuid-here",
        "name": "Cardiology Associates",
        "email": "info@cardiologyassociates.com",
        "phone": "+27123456789",
        "address": "123 Medical Center Dr, Johannesburg",
        "specialization": "Cardiology",
        "description": "Specialized cardiac care",
        "status": "active",
        "website": "https://cardiologyassociates.com",
        "operatingHours": "Mon-Fri 8AM-6PM",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 25,
      "totalPages": 5
    }
  }
}
```

### 2. Get Practice by ID

**GET** `/api/practices/:id`

Retrieves a specific practice by its ID.

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/practices/uuid-here" \
  -H "Authorization: Bearer <your-jwt-token>"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Cardiology Associates",
    "email": "info@cardiologyassociates.com",
    "phone": "+27123456789",
    "address": "123 Medical Center Dr, Johannesburg",
    "specialization": "Cardiology",
    "description": "Specialized cardiac care",
    "status": "active",
    "website": "https://cardiologyassociates.com",
    "operatingHours": "Mon-Fri 8AM-6PM",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Create Practice

**POST** `/api/practices`

Creates a new practice.

#### Request Body

```json
{
  "name": "New Medical Practice",
  "email": "info@newpractice.com",
  "phone": "+27123456789",
  "address": "456 Healthcare Ave, Cape Town",
  "specialization": "General Practice",
  "description": "Comprehensive medical care",
  "status": "active",
  "website": "https://newpractice.com",
  "operatingHours": "Mon-Fri 8AM-5PM"
}
```

#### Required Fields

- `name`: Practice name
- `email`: Practice email (must be unique)

#### Optional Fields

- `phone`: Contact phone number
- `address`: Practice address
- `specialization`: Medical specialization (default: "General Practice")
- `description`: Practice description
- `status`: Practice status (default: "active")
- `website`: Practice website
- `operatingHours`: Operating hours

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/practices" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Medical Practice",
    "email": "info@newpractice.com",
    "phone": "+27123456789",
    "address": "456 Healthcare Ave, Cape Town",
    "specialization": "General Practice",
    "description": "Comprehensive medical care",
    "status": "active",
    "website": "https://newpractice.com",
    "operatingHours": "Mon-Fri 8AM-5PM"
  }'
```

#### Example Response

```json
{
  "success": true,
  "message": "Practice created successfully",
  "data": {
    "id": "new-uuid-here",
    "name": "New Medical Practice",
    "email": "info@newpractice.com",
    "phone": "+27123456789",
    "address": "456 Healthcare Ave, Cape Town",
    "specialization": "General Practice",
    "description": "Comprehensive medical care",
    "status": "active",
    "website": "https://newpractice.com",
    "operatingHours": "Mon-Fri 8AM-5PM",
    "createdAt": "2024-01-15T11:00:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### 4. Update Practice

**PUT** `/api/practices/:id`

Updates an existing practice.

#### Request Body

Same structure as create, but all fields are optional.

#### Example Request

```bash
curl -X PUT "http://localhost:3000/api/practices/uuid-here" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Practice Name",
    "phone": "+27123456788"
  }'
```

#### Example Response

```json
{
  "success": true,
  "message": "Practice updated successfully",
  "data": {
    "id": "uuid-here",
    "name": "Updated Practice Name",
    "email": "info@cardiologyassociates.com",
    "phone": "+27123456788",
    "address": "123 Medical Center Dr, Johannesburg",
    "specialization": "Cardiology",
    "description": "Specialized cardiac care",
    "status": "active",
    "website": "https://cardiologyassociates.com",
    "operatingHours": "Mon-Fri 8AM-6PM",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:15:00Z"
  }
}
```

### 5. Delete Practice

**DELETE** `/api/practices/:id`

Deletes a practice.

#### Example Request

```bash
curl -X DELETE "http://localhost:3000/api/practices/uuid-here" \
  -H "Authorization: Bearer <your-jwt-token>"
```

#### Example Response

```json
{
  "success": true,
  "message": "Practice deleted successfully",
  "data": {
    "id": "uuid-here",
    "name": "Cardiology Associates",
    "email": "info@cardiologyassociates.com"
  }
}
```

### 6. Get Practice Statistics

**GET** `/api/practices/stats`

Retrieves practice statistics.

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/practices/stats" \
  -H "Authorization: Bearer <your-jwt-token>"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "totalPractices": 25,
    "activePractices": 22,
    "totalDoctors": 150,
    "totalAppointments": 1250
  }
}
```

## Specializations

The following specializations are supported:

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

## Status Values

- `active`: Practice is operational
- `inactive`: Practice is temporarily closed
- `pending`: Practice is awaiting approval

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Practice name is required"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Practice not found"
}
```

### 409 Conflict

```json
{
  "success": false,
  "message": "Practice with this email already exists"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Frontend Integration

### Using the Practice Service

```javascript
import { practiceService } from "../services/practiceService";

// Get all practices
const practices = await practiceService.getAllPractices();

// Get practice by ID
const practice = await practiceService.getPractice("practice-id");

// Create practice
const newPractice = await practiceService.createPractice(practiceData);

// Update practice
const updatedPractice = await practiceService.updatePractice(
  "practice-id",
  updateData
);

// Delete practice
await practiceService.deletePractice("practice-id");

// Get statistics
const stats = await practiceService.getPracticeStats();
```

### Error Handling

```javascript
try {
  const practices = await practiceService.getAllPractices();
  // Handle success
} catch (error) {
  console.error("Error fetching practices:", error.message);
  // Handle error (show notification, etc.)
}
```

## Testing

Use the provided test script to verify API functionality:

```bash
cd backend
node test-practice-api.js
```

Note: The test script requires admin authentication. You may need to temporarily remove auth middleware or provide valid admin credentials.

## Database Schema

The practices table has the following structure:

```sql
CREATE TABLE practices (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text,
    address text,
    specialization text DEFAULT 'General Practice',
    description text,
    status text DEFAULT 'active',
    website text,
    operating_hours text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
);
```

## Security Considerations

1. **Authentication**: All endpoints require admin authentication
2. **Authorization**: Only admin users can access practice management
3. **Input Validation**: All input is validated before processing
4. **SQL Injection**: Protected through parameterized queries
5. **Data Sanitization**: All data is sanitized before storage

## Rate Limiting

Consider implementing rate limiting for production use:

```javascript
const rateLimit = require("express-rate-limit");

const practiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api/practices", practiceLimiter);
```

## Monitoring and Logging

The API includes comprehensive logging for debugging and monitoring:

- All requests are logged with timestamps
- Error responses include detailed error messages
- Database queries are logged for performance monitoring
- Authentication attempts are logged for security monitoring
