// src/tests/setup.js
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const { mockDeep, mockReset } = require("jest-mock-extended");

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Mock Prisma
const prismaMock = mockDeep();
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Global test timeout
jest.setTimeout(10000);

module.exports = {
  prismaMock,
};
