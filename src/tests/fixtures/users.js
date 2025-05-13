exports.users = [
  {
    id: "1",
    email: "admin@example.com",
    password: "$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Hashed password
    name: "Admin User",
    role: "ADMIN",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  },
  {
    id: "2",
    email: "doctor@example.com",
    password: "$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    name: "Dr. Smith",
    role: "DOCTOR",
    createdAt: new Date("2023-01-02"),
    updatedAt: new Date("2023-01-02"),
  },
  {
    id: "3",
    email: "receptionist@example.com",
    password: "$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    name: "Jane Receptionist",
    role: "STAFF",
    createdAt: new Date("2023-01-03"),
    updatedAt: new Date("2023-01-03"),
  },
  {
    id: "4",
    email: "patient@example.com",
    password: "$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    name: "John Patient",
    role: "PATIENT",
    createdAt: new Date("2023-01-04"),
    updatedAt: new Date("2023-01-04"),
  },
];
