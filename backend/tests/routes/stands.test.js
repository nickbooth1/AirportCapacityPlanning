const request = require('supertest');
const app = require('../../src/index');
const { db } = require('../../src/utils/db');

describe('Stands API', () => {
  let testStandId;
  let testPierId;
  let testTerminalId;
  
  // Generate unique codes to avoid conflicts
  const timestamp = Date.now();
  const uniqueTerminalCode = `TTS${timestamp}`;
  const uniquePierCode = `TPS${timestamp}`;
  const uniqueStandCode = `TS${timestamp}`;
  
  // Test data
  const testStand = {
    name: 'Test Stand',
    code: uniqueStandCode,
    is_active: true,
    stand_type: 'Remote',
    has_jetbridge: false,
    description: 'Test Stand for API Tests'
  };
  
  // Setup - create dependencies (terminal, pier)
  beforeAll(async () => {
    // Create test terminal
    const [terminalId] = await db('terminals').insert({
      name: 'Test Terminal for Stands',
      code: uniqueTerminalCode,
      description: 'Test Terminal for Stand Tests'
    }).returning('id');
    
    testTerminalId = terminalId;
    
    // Create test pier associated with the terminal
    const [pierId] = await db('piers').insert({
      name: 'Test Pier for Stands',
      code: uniquePierCode,
      terminal_id: testTerminalId,
      description: 'Test Pier for Stand Tests'
    }).returning('id');
    
    testPierId = pierId;
    testStand.pier_id = testPierId;
  });
  
  // Clean up after all tests
  afterAll(async () => {
    // Clean up test data
    try {
      if (testStandId) {
        await db('stands').where('id', testStandId).del();
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
  
  describe('GET /api/stands', () => {
    it('should return a list of stands', async () => {
      const response = await request(app).get('/api/stands');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
  
  describe('POST /api/stands', () => {
    it('should create a new stand', async () => {
      const response = await request(app)
        .post('/api/stands')
        .send(testStand);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testStand.name);
      expect(response.body.code).toBe(testStand.code);
      expect(response.body.pier_id).toBe(testStand.pier_id);
      
      // Save ID for later tests
      testStandId = response.body.id;
    });
    
    it('should reject creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/stands')
        .send({
          // Missing required fields
          is_active: true,
          description: 'Test Stand Description'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', true);
    });
    
    it('should reject creation with invalid pier ID', async () => {
      const response = await request(app)
        .post('/api/stands')
        .send({
          name: 'Invalid Pier Stand',
          code: 'IPS',
          pier_id: 9999, // Non-existent pier ID
          is_active: true
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', true);
    });
    
    it('should reject creation with duplicate code within the same pier', async () => {
      const response = await request(app)
        .post('/api/stands')
        .send({
          name: 'Duplicate Code Stand',
          code: testStand.code, // Same code
          pier_id: testStand.pier_id, // Same pier
          is_active: true
        });
      
      expect(response.status).toBe(409); // Conflict
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('GET /api/stands/:id', () => {
    it('should return a specific stand', async () => {
      const response = await request(app).get(`/api/stands/${testStandId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testStandId);
      expect(response.body.name).toBe(testStand.name);
      expect(response.body).toHaveProperty('pier_name');
      expect(response.body).toHaveProperty('terminal_name');
    });
    
    it('should return 404 for non-existent stand', async () => {
      const response = await request(app).get('/api/stands/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('GET /api/stands/by-pier/:pierId', () => {
    it('should return stands for a specific pier', async () => {
      const response = await request(app).get(`/api/stands/by-pier/${testPierId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some(stand => stand.id === testStandId)).toBe(true);
    });
    
    it('should return 404 for non-existent pier', async () => {
      const response = await request(app).get('/api/stands/by-pier/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('PUT /api/stands/:id', () => {
    it('should update a stand', async () => {
      const updatedData = {
        ...testStand,
        name: 'Updated Test Stand',
        is_active: false,
        has_jetbridge: false,
        description: 'Updated stand description'
      };
      
      const response = await request(app)
        .put(`/api/stands/${testStandId}`)
        .send(updatedData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testStandId);
      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.is_active).toBe(updatedData.is_active);
      expect(response.body.description).toBe(updatedData.description);
    });
    
    it('should return 404 for updating non-existent stand', async () => {
      const response = await request(app)
        .put('/api/stands/9999')
        .send(testStand);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('DELETE /api/stands/:id', () => {
    it('should delete a stand', async () => {
      const response = await request(app).delete(`/api/stands/${testStandId}`);
      
      expect(response.status).toBe(204);
      
      // Verify it's gone
      const getResponse = await request(app).get(`/api/stands/${testStandId}`);
      expect(getResponse.status).toBe(404);
      
      // Clear ID as we've deleted it
      testStandId = null;
    });
    
    it('should return 404 for deleting non-existent stand', async () => {
      const response = await request(app).delete('/api/stands/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
}); 