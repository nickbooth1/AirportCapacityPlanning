/**
 * Airport Configuration Service
 * 
 * Provides functionality for managing airport configuration settings, including
 * base airport selection and airline terminal allocations.
 */

const db = require('../db');

/**
 * Get the current airport configuration
 * @returns {Promise<Object>} The configuration with base airport and allocations
 */
async function getConfig() {
  // Get the configuration record (assume first record is used)
  const configRecord = await db('airport_configuration').first();
  
  let baseAirport = null;
  if (configRecord && configRecord.base_airport_id) {
    baseAirport = await db('airports')
      .where('id', configRecord.base_airport_id)
      .first();
  }
  
  return {
    id: configRecord ? configRecord.id : null,
    baseAirport: baseAirport
  };
}

/**
 * Update the airport configuration
 * @param {Object} config Configuration data containing base airport ID
 * @returns {Promise<Object>} The updated configuration
 */
async function updateConfig(config) {
  // Check if configuration record exists
  const existingConfig = await db('airport_configuration').first();
  
  if (existingConfig) {
    // Update existing record
    await db('airport_configuration')
      .where('id', existingConfig.id)
      .update({
        base_airport_id: config.baseAirportId,
        updated_at: new Date()
      });
      
    return getConfig();
  } else {
    // Create new record
    const [newConfigId] = await db('airport_configuration')
      .insert({
        base_airport_id: config.baseAirportId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id');
      
    return getConfig();
  }
}

/**
 * Get all airline terminal allocations
 * @returns {Promise<Array>} List of airline terminal allocations with related data
 */
async function getAllocations() {
  return db('airline_terminal_allocations as ata')
    .select(
      'ata.id',
      'a.id as airline_id',
      'a.name as airline_name',
      'a.iata_code as airline_iata_code',
      't.id as terminal_id',
      't.name as terminal_name',
      't.code as terminal_code',
      'g.id as gha_id',
      'g.name as gha_name'
    )
    .leftJoin('airlines as a', 'ata.airline_id', 'a.id')
    .leftJoin('terminals as t', 'ata.terminal_id', 't.id')
    .leftJoin('ground_handling_agents as g', 'ata.gha_id', 'g.id')
    .orderBy('a.name');
}

/**
 * Add a new airline terminal allocation
 * @param {Object} allocation The allocation data
 * @returns {Promise<Object>} The created allocation
 */
async function addAllocation(allocation) {
  const [newAllocationId] = await db('airline_terminal_allocations')
    .insert({
      airline_id: allocation.airlineId,
      terminal_id: allocation.terminalId,
      gha_id: allocation.ghaId || null,
      created_at: new Date(),
      updated_at: new Date()
    })
    .returning('id');
    
  // Get complete allocation with joins
  return getOneAllocation(newAllocationId);
}

/**
 * Update an existing airline terminal allocation
 * @param {number} id The allocation ID
 * @param {Object} allocation The updated allocation data
 * @returns {Promise<Object>} The updated allocation
 */
async function updateAllocation(id, allocation) {
  await db('airline_terminal_allocations')
    .where('id', id)
    .update({
      airline_id: allocation.airlineId,
      terminal_id: allocation.terminalId,
      gha_id: allocation.ghaId || null,
      updated_at: new Date()
    });
    
  return getOneAllocation(id);
}

/**
 * Delete an airline terminal allocation
 * @param {number} id The allocation ID
 * @returns {Promise<boolean>} Whether the deletion was successful
 */
async function deleteAllocation(id) {
  const deleted = await db('airline_terminal_allocations')
    .where('id', id)
    .delete();
    
  return deleted > 0;
}

/**
 * Get a specific airline terminal allocation by ID
 * @param {number} id The allocation ID
 * @returns {Promise<Object>} The allocation data
 */
async function getOneAllocation(id) {
  return db('airline_terminal_allocations as ata')
    .select(
      'ata.id',
      'a.id as airline_id',
      'a.name as airline_name',
      'a.iata_code as airline_iata_code',
      't.id as terminal_id',
      't.name as terminal_name',
      't.code as terminal_code',
      'g.id as gha_id',
      'g.name as gha_name'
    )
    .leftJoin('airlines as a', 'ata.airline_id', 'a.id')
    .leftJoin('terminals as t', 'ata.terminal_id', 't.id')
    .leftJoin('ground_handling_agents as g', 'ata.gha_id', 'g.id')
    .where('ata.id', id)
    .first();
}

module.exports = {
  getConfig,
  updateConfig,
  getAllocations,
  addAllocation,
  updateAllocation,
  deleteAllocation,
  getOneAllocation
}; 