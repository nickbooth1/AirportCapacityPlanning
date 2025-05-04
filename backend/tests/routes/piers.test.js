const request = require('supertest');
const app = require('../../src/index');
const { db } = require('../../src/utils/db');

describe('Piers API', () => {
  let testPierId;
  let testTerminalId;
  
  // Generate unique codes to avoid conflicts
  const timestamp = Date.now();
  const uniqueTerminalCode = `TTR${timestamp}`;
  const uniquePierCode = `TPR${timestamp}`;
  
  // Test data
  const testPier = {
    name: 'Test Pier',
    code: uniquePierCode,
    description: 'Test Pier for API Tests'
  };
  
  // Setup - create test terminal
  beforeAll(async () => {
    // Create test terminal for pier foreign key
    const [terminalId] = await db('terminals').insert({
      name: 'Test Terminal for Piers',
      code: uniqueTerminalCode,
      description: 'Test Terminal for Pier Tests'
    }).returning('id');
    
    testTerminalId = terminalId;
    testPier.terminal_id = testTerminalId;
  });
  
  afterAll(async () => {
    // Clean up test data
    try {
      if (testPierId) {
        await db('piers').where('id', testPierId).del();
      }
      if (testTerminalId) {
        await db('terminals').where('id', testTerminalId).del();
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  });
  
  describe('GET /api/piers', () => {
    it('should return a list of piers', async () => {
      const response = await request(app).get('/api/piers');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
  
  describe('POST /api/piers', () => {
    it('should create a new pier', async () => {
      const response = await request(app)
        .post('/api/piers')
        .send(testPier);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testPier.name);
      expect(response.body.code).toBe(testPier.code);
      expect(response.body.terminal_id).toBe(testPier.terminal_id);
      
      // Save ID for later tests
      testPierId = response.body.id;
    });
    
    it('should reject creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/piers')
        .send({
          // Missing required fields
          description: 'Test Pier Description'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', true);
    });
    
    it('should reject creation with invalid terminal ID', async () => {
      const response = await request(app)
        .post('/api/piers')
        .send({
          name: 'Invalid Terminal Pier',
          code: 'ITP',
          terminal_id: 9999, // Non-existent terminal ID
          description: 'This should fail'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', true);
    });
    
    it('should reject creation with duplicate code within the same terminal', async () => {
      const response = await request(app)
        .post('/api/piers')
        .send({
          name: 'Duplicate Code Pier',
          code: testPier.code, // Same code
          terminal_id: testPier.terminal_id, // Same terminal
          description: 'This should fail'
        });
      
      expect(response.status).toBe(409); // Conflict
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('GET /api/piers/:id', () => {
    it('should return a specific pier', async () => {
      const response = await request(app).get(`/api/piers/${testPierId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testPierId);
      expect(response.body.name).toBe(testPier.name);
      expect(response.body).toHaveProperty('terminal_name');
    });
    
    it('should return 404 for non-existent pier', async () => {
      const response = await request(app).get('/api/piers/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('GET /api/piers/by-terminal/:terminalId', () => {
    it('should return piers for a specific terminal', async () => {
      const response = await request(app).get(`/api/piers/by-terminal/${testTerminalId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some(pier => pier.id === testPierId)).toBe(true);
    });
    
    it('should return 404 for non-existent terminal', async () => {
      const response = await request(app).get('/api/piers/by-terminal/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('PUT /api/piers/:id', () => {
    it('should update a pier', async () => {
      const updatedData = {
        ...testPier,
        name: 'Updated Test Pier',
        description: 'Updated description'
      };
      
      const response = await request(app)
        .put(`/api/piers/${testPierId}`)
        .send(updatedData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testPierId);
      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.description).toBe(updatedData.description);
    });
    
    it('should return 404 for updating non-existent pier', async () => {
      const response = await request(app)
        .put('/api/piers/9999')
        .send(testPier);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('DELETE /api/piers/:id', () => {
    it('should delete a pier', async () => {
      const response = await request(app).delete(`/api/piers/${testPierId}`);
      
      expect(response.status).toBe(204);
      
      // Verify it's gone
      const getResponse = await request(app).get(`/api/piers/${testPierId}`);
      expect(getResponse.status).toBe(404);
      
      // Clear ID as we've deleted it
      testPierId = null;
    });
    
    it('should return 404 for deleting non-existent pier', async () => {
      const response = await request(app).delete('/api/piers/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
}); 