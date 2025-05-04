const { db, testConnection } = require('../../src/utils/db');

describe('Database Connection', () => {
  afterAll(async () => {
    await db.destroy();
  });

  test('should connect to the database successfully', async () => {
    const result = await testConnection();
    expect(result).toBe(true);
  });

  test('should query a table from the database', async () => {
    // Check if the terminals table exists and has records
    const terminals = await db('terminals').select('*').limit(1);
    expect(Array.isArray(terminals)).toBe(true);
  });
}); 