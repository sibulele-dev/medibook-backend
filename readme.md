# Backend API - User Management System

This backend provides a comprehensive user management system with role-based authentication for doctors and administrators.

## Features

- **User Registration & Authentication**: Secure user registration and login with JWT tokens
- **Role-Based Access Control**: Two roles - `doctor` (default) and `admin`
- **Automatic Role Assignment**: Users with allowed admin emails automatically get admin role
- **Secure Password Hashing**: Passwords are hashed using bcrypt
- **NanoID Integration**: Unique user IDs generated using nanoid
- **Protected Routes**: Authentication and authorization middleware
- **Database Integration**: PostgreSQL with Drizzle ORM

## User Schema

### User Table Structure

```sql
- id: text (primary key, nanoid generated)
- email: text (unique, not null)
- password: text (hashed, not null)
- firstName: text (not null)
- lastName: text (not null)
- role: enum ('doctor', 'admin') (default: 'doctor')
- isActive: boolean (default: true)
- emailVerified: boolean (default: false)
- createdAt: timestamp (default: now)
- updatedAt: timestamp (default: now)
```

### Role Assignment Logic

- **Default Role**: All users get `doctor` role by default
- **Admin Role**: Users with emails in `ALLOWED_ADMIN_EMAILS` array get `admin` role
- **Admin Emails**: Currently set to `["admin@medibook.com", "superadmin@medibook.com"]`

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Database Setup

1. Ensure PostgreSQL is running
2. Create your database
3. Update the `DATABASE_URL` in your `.env` file
4. Run migrations (when implemented)

### 4. Start the Server

```bash
npm run dev
```

## API Endpoints

### Public Routes

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user

### Protected Routes (Require Authentication)

- `GET /api/users/profile/:id?` - Get user profile
- `PUT /api/users/profile/:id?` - Update user profile

### Admin Routes (Require Admin Role)

- `GET /api/users/all` - Get all users
- `DELETE /api/users/:id` - Delete user

## Request/Response Examples

### Register User

```http
POST /api/users/register
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "abc123...",
      "email": "doctor@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "doctor",
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "role": "doctor",
    "isAdmin": false,
    "token": "jwt_token_here"
  }
}
```

### Login User

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "admin@medibook.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "abc123...",
      "email": "admin@medibook.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "role": "admin",
    "isAdmin": true,
    "token": "jwt_token_here"
  }
}
```

### Protected Route Example

```http
GET /api/users/profile
Authorization: Bearer jwt_token_here
```

## Authentication

### JWT Token Usage

Include the JWT token in the Authorization header for protected routes:

```
Authorization: Bearer your_jwt_token_here
```

### Role-Based Access

- **Doctor Role**: Can access doctor-specific features
- **Admin Role**: Can access all features including user management

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Authorization**: Access control based on user roles
- **Input Validation**: Comprehensive validation for all inputs
- **SQL Injection Protection**: Using Drizzle ORM for safe database queries

## Customization

### Adding Admin Emails

To add more admin emails, modify the `ALLOWED_ADMIN_EMAILS` array in:

- `src/schema/user.js`
- `src/config/config.js`

### Changing Default Role

To change the default role, modify the `default("doctor")` in the user schema.

### Password Requirements

To modify password requirements, update the validation in `src/controllers/userController.js`.

## Dependencies

- **express**: Web framework
- **drizzle-orm**: Database ORM
- **postgres**: PostgreSQL client
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **nanoid**: Unique ID generation
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management

.listen(PORT, async () => {
console.log(`🚀 Server is running on port ${PORT}`);
console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🌐 Server URL: http://localhost:${PORT}`);
