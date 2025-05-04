const { db } = require('../../src/utils/db');

describe('Entity Relationships Integration', () => {
  let terminalId;
  let pierId;
  let standId;
  let aircraftTypeId;
  let constraintId;
  
  // Test data
  const testTerminal = {
    name: 'Integration Test Terminal',
    code: 'ITT',
    description: 'Terminal for integration testing'
  };
  
  const testPier = {
    name: 'Integration Test Pier',
    code: 'ITP',
    description: 'Pier for integration testing'
  };
  
  const testStand = {
    name: 'Integration Test Stand',
    code: 'ITS',
    is_active: true,
    stand_type: 'contact',
    has_jetbridge: true,
    description: 'Stand for integration testing'
  };
  
  const testAircraftType = {
    iata_code: 'ITY',
    icao_code: 'ITYP',
    name: 'Integration Test Aircraft',
    manufacturer: 'Test Manufacturer',
    model: 'Test-IT100',
    wingspan_meters: 30,
    length_meters: 35,
    size_category: 'C'
  };
  
  // Setup and teardown
  beforeAll(async () => {
    // Clean up any existing test data
    await db('stand_aircraft_constraints')
      .where('constraint_reason', 'like', '%integration test%')
      .del();
    await db('stands')
      .where('name', 'like', '%Integration Test%')
      .del();
    await db('piers')
      .where('name', 'like', '%Integration Test%')
      .del();
    await db('terminals')
      .where('name', 'like', '%Integration Test%')
      .del();
    await db('aircraft_types')
      .where('name', 'like', '%Integration Test%')
      .del();
  });
  
  afterAll(async () => {
    // Clean up test data
    if (constraintId) {
      await db('stand_aircraft_constraints').where({ id: constraintId }).del();
    }
    if (standId) {
      await db('stands').where({ id: standId }).del();
    }
    if (pierId) {
      await db('piers').where({ id: pierId }).del();
    }
    if (terminalId) {
      await db('terminals').where({ id: terminalId }).del();
    }
    if (aircraftTypeId) {
      await db('aircraft_types').where({ id: aircraftTypeId }).del();
    }
    
    await db.destroy();
  });
  
  test('should create a terminal', async () => {
    const [id] = await db('terminals').insert(testTerminal).returning('id');
    terminalId = id;
    
    const terminal = await db('terminals').where({ id: terminalId }).first();
    expect(terminal).toBeTruthy();
    expect(terminal.name).toBe(testTerminal.name);
    expect(terminal.code).toBe(testTerminal.code);
  });
  
  test('should create a pier associated with the terminal', async () => {
    testPier.terminal_id = terminalId;
    const [id] = await db('piers').insert(testPier).returning('id');
    pierId = id;
    
    const pier = await db('piers').where({ id: pierId }).first();
    expect(pier).toBeTruthy();
    expect(pier.name).toBe(testPier.name);
    expect(pier.terminal_id).toBe(terminalId);
    
    // Test joining with terminal
    const pierWithTerminal = await db('piers')
      .select('piers.*', 'terminals.name as terminal_name')
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('piers.id', pierId)
      .first();
      
    expect(pierWithTerminal).toBeTruthy();
    expect(pierWithTerminal.terminal_name).toBe(testTerminal.name);
  });
  
  test('should create a stand associated with the pier', async () => {
    testStand.pier_id = pierId;
    const [id] = await db('stands').insert(testStand).returning('id');
    standId = id;
    
    const stand = await db('stands').where({ id: standId }).first();
    expect(stand).toBeTruthy();
    expect(stand.name).toBe(testStand.name);
    expect(stand.pier_id).toBe(pierId);
    
    // Test joining with pier and terminal
    const standWithRelations = await db('stands')
      .select(
        'stands.*',
        'piers.name as pier_name',
        'terminals.name as terminal_name'
      )
      .leftJoin('piers', 'stands.pier_id', 'piers.id')
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('stands.id', standId)
      .first();
      
    expect(standWithRelations).toBeTruthy();
    expect(standWithRelations.pier_name).toBe(testPier.name);
    expect(standWithRelations.terminal_name).toBe(testTerminal.name);
  });
  
  test('should create an aircraft type', async () => {
    const [id] = await db('aircraft_types').insert(testAircraftType).returning('id');
    aircraftTypeId = id;
    
    const aircraftType = await db('aircraft_types').where({ id: aircraftTypeId }).first();
    expect(aircraftType).toBeTruthy();
    expect(aircraftType.name).toBe(testAircraftType.name);
    expect(aircraftType.iata_code).toBe(testAircraftType.iata_code);
  });
  
  test('should create a stand-aircraft constraint', async () => {
    const constraint = {
      stand_id: standId,
      aircraft_type_id: aircraftTypeId,
      is_allowed: true,
      constraint_reason: 'Constraint for integration test'
    };
    
    const [id] = await db('stand_aircraft_constraints').insert(constraint).returning('id');
    constraintId = id;
    
    const savedConstraint = await db('stand_aircraft_constraints').where({ id: constraintId }).first();
    expect(savedConstraint).toBeTruthy();
    expect(savedConstraint.stand_id).toBe(standId);
    expect(savedConstraint.aircraft_type_id).toBe(aircraftTypeId);
    
    // Test joining with stand and aircraft type
    const constraintWithRelations = await db('stand_aircraft_constraints')
      .select(
        'stand_aircraft_constraints.*',
        'stands.name as stand_name',
        'aircraft_types.name as aircraft_name'
      )
      .leftJoin('stands', 'stand_aircraft_constraints.stand_id', 'stands.id')
      .leftJoin('aircraft_types', 'stand_aircraft_constraints.aircraft_type_id', 'aircraft_types.id')
      .where('stand_aircraft_constraints.id', constraintId)
      .first();
      
    expect(constraintWithRelations).toBeTruthy();
    expect(constraintWithRelations.stand_name).toBe(testStand.name);
    expect(constraintWithRelations.aircraft_name).toBe(testAircraftType.name);
  });
  
  test('should cascade delete stands when pier is deleted', async () => {
    // First check that stand exists
    const standBefore = await db('stands').where({ id: standId }).first();
    expect(standBefore).toBeTruthy();
    
    // Delete the pier
    await db('piers').where({ id: pierId }).del();
    pierId = null; // Pier is now deleted
    
    // Check that stand was deleted
    const standAfter = await db('stands').where({ id: standId }).first();
    expect(standAfter).toBeFalsy();
    
    standId = null; // Stand is now deleted
    constraintId = null; // Constraint is also deleted due to cascade
  });
  
  test('should cascade delete piers when terminal is deleted', async () => {
    // Create new test pier for this test
    const newPier = { ...testPier, terminal_id: terminalId, code: 'ITP2' };
    const [newPierId] = await db('piers').insert(newPier).returning('id');
    
    // Check that pier exists
    const pierBefore = await db('piers').where({ id: newPierId }).first();
    expect(pierBefore).toBeTruthy();
    
    // Delete the terminal
    await db('terminals').where({ id: terminalId }).del();
    terminalId = null; // Terminal is now deleted
    
    // Check that pier was deleted
    const pierAfter = await db('piers').where({ id: newPierId }).first();
    expect(pierAfter).toBeFalsy();
  });
}); 