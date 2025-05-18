/**
 * Jest setup for memory-based service tests that don't require database connections
 */

// This setup file is intentionally minimal and doesn't connect to the database
// It's used for testing services that don't require database connections

// Mock the global console methods to suppress output during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Set test environment
process.env.NODE_ENV = 'test';