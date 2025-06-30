# Registration Restrictions

This document outlines the registration restrictions implemented in the backend to ensure only authorized admin emails can register new users.

## Overview

The registration system has been modified to restrict user registration to only those email addresses that are pre-authorized as admin emails. This provides better security and control over who can access the system.

## How It Works

### 1. Admin Email Configuration

Admin emails are configured through the `ALLOWED_ADMIN_EMAILS` environment variable:

```env

```

### 2. Registration Methods

The system provides two different registration methods:

#### **Public Registration (Admin Only)**

- **Route**: `POST /api/users/register`
- **Purpose**: Allows authorized admin emails to register themselves
- **Restriction**: Only emails in `ALLOWED_ADMIN_EMAILS` can register
- **Role**: Automatically assigned admin role
- **Access**: Public endpoint (no authentication required)

#### **Admin Doctor Registration**

- **Route**: `POST /api/users/admin/register-doctor`
- **Purpose**: Allows existing admins to register new doctors
- **Restriction**: Only authenticated admins can use this endpoint
- **Role**: Always assigned doctor role
- **Access**: Admin-only endpoint (requires admin authentication)
- **Additional Fields**: Supports doctor-specific fields like specialization, bio, etc.

### 3. Registration Process

When a user attempts to register:

1. **Email Validation**: The system validates the email format
2. **Authorization Check**: The system checks if the email is in the allowed admin emails list
3. **Registration**: If authorized, the user is registered with admin privileges
4. **Rejection**: If not authorized, registration is denied with a clear error message

### 4. Error Handling

- **403 Forbidden**: Email not in allowed list
- **400 Bad Request**: Invalid email format or missing fields
- **409 Conflict**: Email already exists

## API Endpoints

### Registration

```
POST /api/users/register
Content-Type: application/json

{
  "email": "admin@medibook.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "admin@medibook.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "isActive": true
    },
    "role": "admin",
    "isAdmin": true,
    "token": "jwt_token"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "message": "Registration is restricted to authorized admin emails only. Please contact the system administrator if you believe you should have access.",
  "code": "REGISTRATION_RESTRICTED"
}
```

### Email Check (Public)

```
GET /api/users/check-email?email=user@example.com
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "isAllowed": false,
    "message": "Email is not authorized for registration"
  }
}
```

### Get Allowed Emails (Admin Only)

```
GET /api/users/admin/allowed-emails
Authorization: Bearer <admin_token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "allowedEmails": ["admin@medibook.com", "superadmin@medibook.com"],
    "count": 2,
    "message": "These emails are authorized for registration"
  }
}
```

### Register Doctor (Admin Only)

```
POST /api/users/admin/register-doctor
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "doctor@medibook.com",
  "password": "SecurePassword123!",
  "firstName": "Dr. Jane",
  "lastName": "Smith",
  "specialization": "Cardiology",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1985-05-15",
  "address": "123 Medical Center Dr, City, State",
  "bio": "Experienced cardiologist with 10+ years of practice"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Doctor registered successfully",
  "data": {
    "doctor": {
      "id": "doctor_id",
      "email": "doctor@medibook.com",
      "firstName": "Dr. Jane",
      "lastName": "Smith",
      "specialization": "Cardiology",
      "phoneNumber": "+1234567890",
      "dateOfBirth": "1985-05-15",
      "address": "123 Medical Center Dr, City, State",
      "bio": "Experienced cardiologist with 10+ years of practice",
      "role": "doctor",
      "isActive": true,
      "emailVerified": false
    },
    "role": "doctor",
    "isAdmin": false,
    "registeredBy": "admin_user_id"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

**Error Response (409):**

```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

## Security Features

### 1. Email Normalization

- All emails are converted to lowercase
- Whitespace is trimmed
- Ensures consistent comparison

### 2. Role Assignment

- All registered users automatically get admin role
- No regular user registration allowed
- Maintains system security

### 3. Clear Error Messages

- Users get specific feedback about why registration failed
- No information leakage about allowed emails
- Professional error handling

## Configuration

### Environment Variables

```env
# Comma-separated list of admin emails
ALLOWED_ADMIN_EMAILS=admin@medibook.com,superadmin@medibook.com

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=12h
```

### Adding New Admin Emails

To add new admin emails:

1. **Update Environment Variable**:

   ```env
   ALLOWED_ADMIN_EMAILS=admin@medibook.com,superadmin@medibook.com,newadmin@medibook.com
   ```

2. **Restart Application**:

   ```bash
   npm restart
   ```

3. **Verify Configuration**:
   ```bash
   curl -H "Authorization: Bearer <admin_token>" \
        http://localhost:3002/api/users/admin/allowed-emails
   ```

## Frontend Integration

### Real-time Email Validation

The frontend can use the email check endpoint for real-time validation:

```javascript
// Check if email is allowed before showing registration form
async function checkEmailAllowed(email) {
  try {
    const response = await fetch(
      `/api/users/check-email?email=${encodeURIComponent(email)}`
    );
    const data = await response.json();

    if (data.success && data.data.isAllowed) {
      // Show registration form
      showRegistrationForm();
    } else {
      // Show restricted message
      showRestrictedMessage();
    }
  } catch (error) {
    console.error("Error checking email:", error);
  }
}
```

### Registration Form Handling

```javascript
async function registerUser(userData) {
  try {
    const response = await fetch("/api/users/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (data.success) {
      // Registration successful
      handleSuccessfulRegistration(data);
    } else if (data.code === "REGISTRATION_RESTRICTED") {
      // Show restricted message
      showRestrictedMessage(data.message);
    } else {
      // Handle other errors
      handleRegistrationError(data.message);
    }
  } catch (error) {
    console.error("Registration error:", error);
  }
}
```

### Doctor Registration (Admin Only)

```javascript
async function registerDoctor(doctorData, adminToken) {
  try {
    const response = await fetch("/api/users/admin/register-doctor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(doctorData),
    });

    const data = await response.json();

    if (data.success) {
      // Doctor registration successful
      handleSuccessfulDoctorRegistration(data);
    } else {
      // Handle errors
      handleRegistrationError(data.message);
    }
  } catch (error) {
    console.error("Doctor registration error:", error);
  }
}

// Example usage
const doctorData = {
  email: "doctor@medibook.com",
  password: "SecurePassword123!",
  firstName: "Dr. Jane",
  lastName: "Smith",
  specialization: "Cardiology",
  phoneNumber: "+1234567890",
  dateOfBirth: "1985-05-15",
  address: "123 Medical Center Dr, City, State",
  bio: "Experienced cardiologist with 10+ years of practice",
};

registerDoctor(doctorData, adminToken);
```

## Best Practices

### 1. Email Management

- Keep the allowed emails list minimal
- Use company domain emails only
- Regularly review and update the list
- Document all authorized emails

### 2. Security

- Never expose the full list of allowed emails publicly
- Use HTTPS in production
- Implement rate limiting on registration endpoints
- Monitor registration attempts

### 3. User Experience

- Provide clear feedback about registration restrictions
- Offer alternative contact methods for unauthorized users
- Maintain professional error messages
- Consider implementing an approval workflow for new admin requests

### 4. Doctor Registration Workflow

#### **Admin Process**

1. **Collect Doctor Information**: Gather all required doctor details
2. **Verify Credentials**: Ensure doctor credentials are valid
3. **Register Doctor**: Use admin panel to register new doctor
4. **Send Welcome Email**: Notify doctor of account creation
5. **Monitor Activity**: Track doctor's initial login and setup

#### **Doctor Onboarding**

1. **Account Creation**: Admin creates doctor account
2. **Email Verification**: Doctor verifies email address
3. **Profile Completion**: Doctor completes profile setup
4. **Training**: Provide system training if needed
5. **Active Status**: Doctor becomes active in the system

#### **Data Validation**

- **Required Fields**: email, password, firstName, lastName
- **Optional Fields**: specialization, phoneNumber, dateOfBirth, address, bio
- **Email Format**: Must be valid email format
- **Password Strength**: Enforce strong password requirements
- **Duplicate Prevention**: Check for existing email addresses

## Troubleshooting

### Common Issues

1. **Registration Fails with 403**

   - Check if email is in `ALLOWED_ADMIN_EMAILS`
   - Verify email format and normalization
   - Ensure environment variable is set correctly

2. **Email Check Returns False**

   - Verify email spelling and domain
   - Check environment variable configuration
   - Restart application after config changes

3. **Admin Can't Access Allowed Emails List**
   - Verify admin authentication
   - Check admin role assignment
   - Ensure proper authorization middleware

### Debug Commands

```bash
# Check current allowed emails (requires admin token)
curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:3002/api/users/admin/allowed-emails

# Test email check
curl "http://localhost:3002/api/users/check-email?email=test@example.com"

# Test registration (will fail if not authorized)
curl -X POST http://localhost:3002/api/users/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123","firstName":"Test","lastName":"User"}'
```

## Future Enhancements

### Planned Features

1. **Approval Workflow**: Allow users to request admin access
2. **Temporary Invitations**: Time-limited registration links
3. **Domain-based Authorization**: Allow entire domains
4. **Audit Logging**: Track registration attempts and approvals

### Scalability Considerations

1. **Database Storage**: Store allowed emails in database
2. **Caching**: Cache allowed emails for performance
3. **API Rate Limiting**: Prevent abuse of registration endpoints
4. **Monitoring**: Track registration patterns and security events
