/**
 * Script to manually add adjacency rules for testing
 */
const { db } = require('../src/utils/db');

async function addAdjacencyRules() {
  try {
    console.log('Starting to add adjacency rules...');
    
    // Get first two stands
    const stands = await db('stands').select('id', 'code').limit(3);
    
    if (stands.length < 2) {
      console.error('Not enough stands found in the database');
      process.exit(1);
    }
    
    console.log(`Found stands: ${stands.map(s => s.code).join(', ')}`);
    
    // First clear any existing rules
    await db('stand_adjacencies').del();
    console.log('Cleared existing adjacency rules');
    
    // Add a "no_use" rule
    const noUseRule = {
      stand_id: stands[0].id,
      adjacent_stand_id: stands[1].id,
      impact_direction: 'BOTH',
      restriction_type: 'no_use',
      is_active: true,
      notes: `When stand ${stands[0].code} is in use, ${stands[1].code} cannot be used at all`
    };
    
    // Add a size limiting rule if we have enough stands
    let sizeLimitRule = null;
    if (stands.length > 2) {
      sizeLimitRule = {
        stand_id: stands[1].id,
        adjacent_stand_id: stands[2].id,
        impact_direction: 'BOTH',
        restriction_type: 'size_limited',
        max_aircraft_size_code: 'C',
        is_active: true,
        notes: `When stand ${stands[1].code} is in use, ${stands[2].code} is limited to aircraft of size C or smaller`
      };
    }
    
    // Insert the rules
    await db('stand_adjacencies').insert(noUseRule);
    console.log('Added no_use adjacency rule');
    
    if (sizeLimitRule) {
      await db('stand_adjacencies').insert(sizeLimitRule);
      console.log('Added size_limited adjacency rule');
    }
    
    // Verify the rules were added
    const rules = await db('stand_adjacencies').select('*');
    console.log(`Successfully added ${rules.length} adjacency rules`);
    console.log(JSON.stringify(rules, null, 2));
    
    console.log('Done!');
  } catch (error) {
    console.error('Error adding adjacency rules:', error);
  } finally {
    // Close the database connection
    db.destroy();
  }
}

// Run the function
addAdjacencyRules(); 