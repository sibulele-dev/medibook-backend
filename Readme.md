medical-booking-api/
├── .env                          # Environment variables (DB connection, JWT secrets, etc.)
├── .gitignore                    # Git ignore file
├── package.json                  # Project dependencies
├── README.md                     # Documentation
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # Database schema definition
│   ├── migrations/               # Database migrations
│   └── seed.js                   # Seed data for development
├── src/
│   ├── index.js                  # Entry point
│   ├── app.js                    # Express app setup
│   ├── config/                   # Configuration
│   │   ├── database.js           # Database configuration
│   │   ├── auth.js               # Auth configuration
│   │   └── email.js              # Email service configuration
│   ├── api/                      # API routes
│   │   ├── routes/
│   │   │   ├── index.js          # API routes index
│   │   │   ├── auth.routes.js    # Auth routes (login, register)
│   │   │   ├── users.routes.js   # User management
│   │   │   ├── practices.routes.js  # Practice management
│   │   │   ├── doctors.routes.js # Doctor management
│   │   │   ├── patients.routes.js # Patient management
│   │   │   ├── appointments.routes.js # Appointment booking/management
│   │   │   ├── schedules.routes.js # Doctor schedules
│   │   │   ├── services.routes.js # Medical services
│   │   │   └── admin.routes.js   # Admin operations
│   │   └── middleware/
│   │       ├── auth.middleware.js # JWT authentication
│   │       ├── validation.middleware.js # Request validation
│   │       ├── practiceAccess.middleware.js # Practice-specific access control
│   │       └── error.middleware.js # Error handling
│   ├── controllers/              # Request handlers
│   │   ├── auth.controller.js    # Authentication logic
│   │   ├── user.controller.js    # User operations
│   │   ├── practice.controller.js # Practice operations
│   │   ├── doctor.controller.js  # Doctor operations
│   │   ├── patient.controller.js # Patient operations
│   │   ├── appointment.controller.js # Appointment operations
│   │   ├── schedule.controller.js # Schedule operations
│   │   ├── service.controller.js # Service operations
│   │   └── admin.controller.js   # Admin operations
│   ├── services/                 # Business logic
│   │   ├── auth.service.js       # Auth business logic
│   │   ├── user.service.js       # User business logic
│   │   ├── practice.service.js   # Practice business logic
│   │   ├── doctor.service.js     # Doctor business logic
│   │   ├── patient.service.js    # Patient business logic
│   │   ├── appointment.service.js # Appointment business logic
│   │   ├── schedule.service.js   # Schedule business logic
│   │   ├── notification.service.js # Email/SMS notifications
│   │   └── file.service.js       # File uploads (doctor/practice images)
│   ├── utils/                    # Utility functions
│   │   ├── jwt.js                # JWT token helpers
│   │   ├── password.js           # Password hashing
│   │   ├── validation.js         # Input validation helpers
│   │   ├── date.js               # Date utilities
│   │   └── logger.js             # Logging utility
│   └──  tests/
|        ├── setup.js                     # Test setup and configuration
|        ├── fixtures/                    # Test data
|        │   ├── practices.js
|        │   ├── users.js
|        │   ├── doctors.js
|        │   ├── patients.js
|        │   └── appointments.js
|        ├── mocks/                       # Mock services and dependencies
|        │   ├── prisma.js
|        │   ├── email.service.js
|        │   └── jwt.js
|        ├── unit/                        # Unit tests
|        │   ├── services/
|        │   │   ├── auth.service.test.js
|        │   │   ├── user.service.test.js
|        │   │   ├── practice.service.test.js
|        │   │   ├── doctor.service.test.js
|        │   │   ├── patient.service.test.js
|        │   │   ├── appointment.service.test.js
|        │   │   ├── schedule.service.test.js
|        │   │   └── notification.service.test.js
|        │   ├── controllers/
|        │   │   ├── auth.controller.test.js
|        │   │   ├── user.controller.test.js
|        │   │   ├── practice.controller.test.js
|        │   │   ├── doctor.controller.test.js
|        │   │   ├── patient.controller.test.js
|        │   │   ├── appointment.controller.test.js
|        │   │   └── schedule.controller.test.js
|        │   ├── middleware/
|        │   │   ├── auth.middleware.test.js
|        │   │   ├── validation.middleware.test.js
|        │   │   └── practiceAccess.middleware.test.js
|        │   └── utils/
|        │       ├── jwt.test.js
|        │       ├── password.test.js
|        │       ├── validation.test.js
|        │       └── date.test.js
|        └── integration/                 # Integration tests
|            ├── auth.routes.test.js
|            ├── users.routes.test.js
|            ├── practices.routes.test.js
|            ├── doctors.routes.test.js
|            ├── patients.routes.test.js
|            ├── appointments.routes.test.js
|            ├── schedules.routes.test.js
|            ├── services.routes.test.js
|            └── admin.routes.test.js
└── uploads/
    ├── .gitkeep                    # Ensures directory is tracked by Git
    ├── practices/                  # Practice-related uploads
    │   └── [practice-id]/          # Each practice has its own directory
    │       ├── logo/               # Practice logos
    │       │   ├── original/       # Original uploaded files
    │       │   │   └── logo.{png|jpg|svg}
    │       │   └── thumbnails/     # Various sized thumbnails
    │       │       ├── logo-sm.{png|jpg}
    │       │       ├── logo-md.{png|jpg}
    │       │       └── logo-lg.{png|jpg}
    │       └── staff/              # Staff photos
    │           └── [staff-id]/     # Individual staff member photos
    │               ├── original/
    │               │   └── profile.{jpg|png}
    │               └── thumbnails/
    │                   └── profile-sm.{jpg|png}
    │
    ├── doctors/                    # Doctor profile images
    │   └── [doctor-id]/            # Each doctor has their own directory
    │       └── profile/            # Profile pictures
    │           ├── original/       # Original uploaded photo
    │           │   └── profile.{jpg|png}
    │           └── thumbnails/     # Various sized thumbnails
    │               ├── profile-sm.{jpg|png}
    │               ├── profile-md.{jpg|png}
    │               └── profile-square.{jpg|png}
    │
    └── backups/                    # Daily database backups
        └── [date]/                 # Organized by date
            └── db-backup.sql       # Database backup file