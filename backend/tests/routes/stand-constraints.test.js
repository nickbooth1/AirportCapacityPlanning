const request = require('supertest');
const app = require('../../src/index');
const { db } = require('../../src/utils/db');

describe('Stand Constraints API', () => {
  let testConstraintId;
  let testStandId;
  let testAircraftTypeId;
  let testPierId;
  let testTerminalId;
  
  // Test data with unique codes to avoid conflicts
  const testConstraint = {
    is_allowed: true,
    constraint_reason: 'Test constraint reason'
  };
  
  // Generate unique codes to avoid conflicts
  const timestamp = Date.now();
  const uniqueTerminalCode = `TTC${timestamp}`;
  const uniquePierCode = `TPC${timestamp}`;
  const uniqueStandCode = `TSC${timestamp}`;
  const uniqueAircraftIataCode = `TS${timestamp % 1000}`;
  const uniqueAircraftIcaoCode = `TES${timestamp % 1000}`;
  
  // Setup - create test dependencies
  beforeAll(async () => {
    // Create test terminal
    const [terminalId] = await db('terminals').insert({
      name: 'Test Terminal for Constraints',
      code: uniqueTerminalCode,
      description: 'Test Terminal for Constraint Tests'
    }).returning('id');
    
    testTerminalId = terminalId;
    
    // Create test pier associated with the terminal
    const [pierId] = await db('piers').insert({
      name: 'Test Pier for Constraints',
      code: uniquePierCode,
      terminal_id: testTerminalId,
      description: 'Test Pier for Constraint Tests'
    }).returning('id');
    
    testPierId = pierId;
    
    // Create test stand
    const [standId] = await db('stands').insert({
      name: 'Test Stand for Constraints',
      code: uniqueStandCode,
      pier_id: testPierId,
      is_active: true,
      description: 'Test Stand for Constraint Tests'
    }).returning('id');
    
    testStandId = standId;
    
    // Create test aircraft type
    const [aircraftTypeId] = await db('aircraft_types').insert({
      iata_code: uniqueAircraftIataCode,
      icao_code: uniqueAircraftIcaoCode,
      name: 'Test Aircraft for Constraints',
      manufacturer: 'Test Manufacturer',
      model: 'Test-C100',
      wingspan_meters: 30,
      length_meters: 35,
      size_category: 'C'
    }).returning('id');
    
    testAircraftTypeId = aircraftTypeId;
    
    // Set up constraint
    testConstraint.stand_id = testStandId;
    testConstraint.aircraft_type_id = testAircraftTypeId;
  });
  
  // Clean up after all tests
  afterAll(async () => {
    // Clean up any test data
    try {
      if (testConstraintId) {
        await db('stand_aircraft_constraints').where('id', testConstraintId).del();
      }
      if (testStandId) {
        await db('stands').where('id', testStandId).del();
      }
      if (testAircraftTypeId) {
        await db('aircraft_types').where('id', testAircraftTypeId).del();
      }
      if (testPierId) {
        await db('piers').where('id', testPierId).del();
      }
      if (testTerminalId) {
        await db('terminals').where('id', testTerminalId).del();
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
    await db.destroy();
  });
  
  describe('GET /api/stand-constraints', () => {
    it('should return a list of stand constraints', async () => {
      const response = await request(app).get('/api/stand-constraints');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
  
  describe('POST /api/stand-constraints', () => {
    it('should create a new stand constraint', async () => {
      const response = await request(app)
        .post('/api/stand-constraints')
        .send(testConstraint);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.stand_id).toBe(testConstraint.stand_id);
      expect(response.body.aircraft_type_id).toBe(testConstraint.aircraft_type_id);
      expect(response.body.is_allowed).toBe(testConstraint.is_allowed);
      
      // Save ID for later tests
      testConstraintId = response.body.id;
    });
    
    it('should reject creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/stand-constraints')
        .send({
          is_allowed: true,
          constraint_reason: 'Missing required fields test'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', true);
    });
    
    it('should reject creation with invalid stand ID', async () => {
      const response = await request(app)
        .post('/api/stand-constraints')
        .send({
          stand_id: 9999, // Non-existent stand ID
          aircraft_type_id: testAircraftTypeId,
          is_allowed: true
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', true);
    });
    
    it('should reject creation with invalid aircraft type ID', async () => {
      const response = await request(app)
        .post('/api/stand-constraints')
        .send({
          stand_id: testStandId,
          aircraft_type_id: 9999, // Non-existent aircraft type ID
          is_allowed: true
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', true);
    });
    
    it('should reject creation with duplicate constraint', async () => {
      const response = await request(app)
        .post('/api/stand-constraints')
        .send({
          stand_id: testConstraint.stand_id,
          aircraft_type_id: testConstraint.aircraft_type_id,
          is_allowed: false
        });
      
      expect(response.status).toBe(409); // Conflict
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('GET /api/stand-constraints/by-stand/:standId', () => {
    it('should return constraints for a specific stand', async () => {
      const response = await request(app).get(`/api/stand-constraints/by-stand/${testStandId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some(constraint => constraint.id === testConstraintId)).toBe(true);
    });
    
    it('should return 404 for non-existent stand', async () => {
      const response = await request(app).get('/api/stand-constraints/by-stand/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('GET /api/stand-constraints/by-aircraft/:aircraftTypeId', () => {
    it('should return constraints for a specific aircraft type', async () => {
      const response = await request(app).get(`/api/stand-constraints/by-aircraft/${testAircraftTypeId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some(constraint => constraint.id === testConstraintId)).toBe(true);
    });
    
    it('should return 404 for non-existent aircraft type', async () => {
      const response = await request(app).get('/api/stand-constraints/by-aircraft/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('PUT /api/stand-constraints/:id', () => {
    it('should update a stand constraint', async () => {
      const updatedData = {
        ...testConstraint,
        is_allowed: false,
        constraint_reason: 'Updated constraint reason'
      };
      
      const response = await request(app)
        .put(`/api/stand-constraints/${testConstraintId}`)
        .send(updatedData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testConstraintId);
      expect(response.body.is_allowed).toBe(updatedData.is_allowed);
      expect(response.body.constraint_reason).toBe(updatedData.constraint_reason);
    });
    
    it('should return 404 for updating non-existent constraint', async () => {
      const response = await request(app)
        .put('/api/stand-constraints/9999')
        .send(testConstraint);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('DELETE /api/stand-constraints/:id', () => {
    it('should delete a stand constraint', async () => {
      const response = await request(app).delete(`/api/stand-constraints/${testConstraintId}`);
      
      expect(response.status).toBe(204);
      
      // Verify it's gone
      const getResponse = await request(app).get('/api/stand-constraints');
      expect(getResponse.body.some(constraint => constraint.id === testConstraintId)).toBe(false);
      
      // Clear ID as we've deleted it
      testConstraintId = null;
    });
    
    it('should return 404 for deleting non-existent constraint', async () => {
      const response = await request(app).delete('/api/stand-constraints/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
}); 