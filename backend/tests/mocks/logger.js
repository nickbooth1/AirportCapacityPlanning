/**
 * Mock logger for testing
 */
module.exports = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};