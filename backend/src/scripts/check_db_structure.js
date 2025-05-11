/**
 * Script to check database structure
 */

const db = require('../utils/db');

async function checkDatabaseStructure() {
  try {
    console.log('Checking database structure...');
    
    // List all tables
    const tables = await db.raw(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    console.log('Tables in the database:');
    tables.rows.forEach(table => {
      console.log(`- ${table.tablename}`);
    });
    
    // Check columns in aircraft_types table
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'aircraft_types'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nColumns in aircraft_types table:');
    columns.rows.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type}, ${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Check data in aircraft_types table
    const count = await db('aircraft_types').count('* as count').first();
    console.log(`\nNumber of records in aircraft_types: ${count.count}`);
    
    // Get sample data
    const sample = await db('aircraft_types').select('*').limit(5);
    console.log('\nSample aircraft_types data:');
    sample.forEach(record => {
      console.log(record);
    });
    
  } catch (error) {
    console.error('Error checking database structure:', error);
  } finally {
    process.exit();
  }
}

// Run the check
checkDatabaseStructure(); 