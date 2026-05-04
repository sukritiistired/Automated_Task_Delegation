/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/__tests__"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  // Increase timeout for DB operations
  testTimeout: 15000,
  // Give open handles (Prisma pool, background ML training) time to settle
  openHandlesTimeout: 3000,
  setupFiles: ["./jest.setup.ts"],
};
