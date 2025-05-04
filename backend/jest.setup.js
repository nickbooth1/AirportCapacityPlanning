const { db } = require('./src/utils/db');

// Clear test data before all tests
beforeAll(async () => {
  try {
    // Use raw SQL for PostgreSQL to disable and re-enable triggers properly
    await db.raw('SET session_replication_role = replica;');
    
    // Clear test tables in reverse order of dependencies
    await db('stand_aircraft_constraints').del();
    await db('stands').del();
    await db('aircraft_types').del();
    await db('piers').del();
    await db('terminals').del();
    
    // Re-enable triggers
    await db.raw('SET session_replication_role = DEFAULT;');
    
    console.log('Test database cleared successfully');
  } catch (error) {
    console.error('Error clearing test database:', error);
  }
});

// Close the database connection after all tests
afterAll(async () => {
  await db.destroy();
}); 