backend
│
├── /prisma
│   ├── schema.prisma      # Prisma schema for database models
│   └── migrations/        # Prisma migrations
│
├── /src
│   ├── /config            # Application configuration
│   │   └── index.js       # Configuration exports
│   │
│   ├── /controllers       # Route controllers
│   │   ├── authController.js
│   │   ├── doctorController.js
│   │   └── adminController.js
│   │
│   ├── /middleware        # Custom middleware
│   │   ├── auth.js        # Authentication middleware
│   │   └── errorHandler.js # Global error handler
│   │
│   ├── /routes            # Express routes
│   │   ├── authRoutes.js
│   │   ├── doctorRoutes.js
│   │   └── adminRoutes.js
│   │
│   ├── /services          # Business logic
│   │   ├── authService.js
│   │   ├── doctorService.js
│   │   └── adminService.js
│   │
│   ├── /utils             # Utility functions
│   │   ├── email.js       # Email functionality
│   │   ├── asyncHandler.js # Catch async errors
│   │   └── tokens.js       # JWT token helpers
│   │
│   └── server.js          # Express app setup
│
├── .env                   # Environment variables
├── .env.example           # Example env vars
└── package.json           # Project dependencies