# Medibook Backend

A Node.js backend for the Medibook medical appointment system.

## Features

- User authentication and authorization
- Session management with Redis
- Email notifications with Nodemailer
- Database management with PostgreSQL and Drizzle ORM
- Admin panel with user management
- Session monitoring and cleanup

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Redis server
- SMTP email service (Gmail, Outlook, etc.)

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Configure your `.env` file with the following variables:

   - Database connection
   - JWT secrets
   - Redis connection
   - Email configuration (see `email-config-example.txt`)

4. Set up the database:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Email Configuration

The application uses Nodemailer for sending emails. Configure your email settings in the `.env` file:

### Gmail Example:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Medibook <your-gmail@gmail.com>
```

### Important Notes:

- For Gmail, you need to use an "App Password" instead of your regular password
- Enable 2-factor authentication on your Gmail account
- Generate an app password in Google Account settings
- See `email-config-example.txt` for other email provider configurations

## API Endpoints

### Authentication

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - User login
- `POST /api/users/logout` - User logout
- `POST /api/users/forgot-password` - Send password reset email

### User Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/all` - Get all users (admin only)

### Session Management (Admin Only)

- `GET /api/users/sessions/stats` - Get session statistics
- `GET /api/users/sessions/active` - Get active sessions
- `POST /api/users/sessions/cleanup` - Cleanup all sessions
- `POST /api/users/sessions/cleanup-expired` - Cleanup expired sessions
- `POST /api/users/sessions/emergency-clear` - Emergency clear all sessions
- `DELETE /api/users/sessions/:sessionToken` - Invalidate specific session

### System Status

- `GET /api/users/status` - Get API status and service health

## Email Features

The application sends the following types of emails:

1. **Welcome Emails** - Sent to new users upon registration
2. **Password Reset Emails** - Sent when users request password reset
3. **Email Verification** - For email verification (if implemented)
4. **Security Alerts** - For suspicious login attempts
5. **Custom Emails** - For admin notifications

## Development

### Running Tests

```bash
npm test
```

### Database Migrations

```bash
npm run db:generate  # Generate new migration
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

### Session Management

The application includes comprehensive session management:

- **Automatic Cleanup**: Expired sessions are automatically cleaned up
- **Manual Cleanup**: Admins can manually cleanup sessions
- **Emergency Clear**: For security breaches, all sessions can be cleared
- **Individual Session Invalidation**: Admins can invalidate specific sessions
- **Session Monitoring**: Real-time session statistics and monitoring

## Security Features

- JWT-based authentication
- Session-based authentication with Redis
- Password hashing with bcrypt
- Email verification system
- Security alerts for suspicious activity
- Admin-only session management
- Emergency session clearing for security breaches

## Environment Variables

See `email-config-example.txt` for complete email configuration examples and `.env.example` for all required environment variables.
