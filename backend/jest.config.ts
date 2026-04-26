import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.integration.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/__tests__/**"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  testEnvironmentOptions: {
    NODE_ENV: "test",
  },
};

export default config;
