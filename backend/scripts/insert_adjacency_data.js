/**
 * Script to directly insert stand adjacency data
 */
const { db } = require('../src/utils/db');

async function insertAdjacencyData() {
  try {
    console.log('Starting adjacency data insertion...');
    
    // Get some stand IDs to work with
    const stands = await db('stands').select('id', 'code').limit(5);
    
    if (stands.length < 2) {
      console.error('Not enough stands found to create adjacency rules.');
      process.exit(1);
    }
    
    console.log(`Found ${stands.length} stands to work with:`, stands.map(s => s.code || s.id).join(', '));
    
    // Check for the constraint definition to see valid values
    console.log('Checking constraint definition...');
    const constraintInfo = await db.raw(`
      SELECT pg_get_constraintdef(c.oid) as constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'stand_adjacencies' AND c.conname = 'stand_adjacencies_impact_direction_check'
    `);
    console.log('Constraint definition:', constraintInfo.rows);
    
    // Delete existing entries
    const deletedCount = await db('stand_adjacencies').del();
    console.log(`Deleted ${deletedCount} existing stand adjacency rules.`);
    
    // Create adjacency data with lowercase impact_direction values
    const adjacencyData = [
      {
        stand_id: stands[0].id,
        adjacent_stand_id: stands[1].id,
        impact_direction: 'left', // Lowercase as per constraint
        restriction_type: 'no_use',
        is_active: true
      }
    ];
    
    // Add a size restriction if we have enough stands
    if (stands.length >= 3) {
      adjacencyData.push({
        stand_id: stands[1].id,
        adjacent_stand_id: stands[2].id,
        impact_direction: 'right', // Lowercase as per constraint
        restriction_type: 'size_limited',
        max_aircraft_size_code: 'C',
        is_active: true
      });
    }
    
    // Insert the data
    const insertedIds = await db('stand_adjacencies').insert(adjacencyData).returning('id');
    console.log(`Inserted ${insertedIds.length} stand adjacency rules with IDs: ${insertedIds.join(', ')}`);
    
    // Verify the insertion
    const rules = await db('stand_adjacencies').select('*');
    console.log(`Verified ${rules.length} adjacency rules in the database.`);
    console.log('Adjacency rules:', JSON.stringify(rules, null, 2));
    
    console.log('Adjacency data insertion completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error inserting adjacency data:', error);
    process.exit(1);
  }
}

// Run the function
insertAdjacencyData(); 