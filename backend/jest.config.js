module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  testTimeout: 30000, // Increase timeout for database operations
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/migrations/**',
    '!src/seeds/**'
  ],
}; 