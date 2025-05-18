/**
 * Debug script to test scenario creation
 */
const knex = require('./src/utils/db');
const axios = require('axios');

async function testScenarioCreation() {
  try {
    console.log('Testing scenario creation...');
    
    // First, check if the table exists and has the correct schema
    console.log('Checking allocation_scenarios table schema...');
    
    const exists = await knex.schema.hasTable('allocation_scenarios');
    console.log(`Table exists: ${exists}`);
    
    if (exists) {
      const columns = await knex('information_schema.columns')
        .select('column_name', 'data_type')
        .where('table_name', 'allocation_scenarios');
      
      console.log('Table columns:', columns);
    } else {
      console.log('Table does not exist, creating it now...');
      
      await knex.schema.createTable('allocation_scenarios', function(table) {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.integer('upload_id').unsigned().references('id').inTable('flight_uploads');
        table.integer('schedule_id').unsigned().references('id').inTable('flight_schedules');
        table.string('status').defaultTo('created');
        table.text('error_message');
        table.timestamp('completion_time');
        table.timestamps(true, true);
      });
      
      console.log('Table created successfully!');
    }
    
    // Get an upload ID to use for testing
    const uploads = await knex('flight_uploads')
      .select('id')
      .orderBy('id', 'desc')
      .limit(1);
    
    if (uploads.length === 0) {
      console.log('No uploads found, cannot test scenario creation.');
      return;
    }
    
    const uploadId = uploads[0].id;
    console.log(`Using upload ID: ${uploadId}`);
    
    // Try to create a scenario manually using direct DB access
    console.log('Creating test scenario directly in database...');
    const [scenarioId] = await knex('allocation_scenarios').insert({
      name: 'Test Scenario',
      description: 'Created by debug script',
      upload_id: uploadId,
      status: 'created',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    console.log(`Test scenario created with ID: ${scenarioId}`);
    
    // Now try using the API
    console.log('\nTesting API scenario creation...');
    try {
      const response = await axios.post('http://localhost:3001/api/flight-schedules/scenarios', {
        name: 'API Test Scenario',
        description: 'Created via API',
        uploadId: uploadId
      });
      
      console.log('API Response:', response.data);
    } catch (error) {
      console.error('API Error:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      } else {
        console.error('Error message:', error.message);
      }
    }
    
    // List all scenarios
    const scenarios = await knex('allocation_scenarios').select('*');
    console.log('\nAll scenarios in database:');
    console.log(scenarios);
    
  } catch (error) {
    console.error('Error in debug script:', error);
  } finally {
    await knex.destroy();
  }
}

// Run the test
testScenarioCreation(); 