const request = require('supertest');
const app = require('../../src/index');
const { db } = require('../../src/utils/db');

describe('Aircraft Types API', () => {
  let testAircraftTypeId;
  
  // Generate unique codes to avoid conflicts
  const timestamp = Date.now();
  const uniqueIataCode = `A${timestamp % 1000}`;
  const uniqueIcaoCode = `TA${timestamp % 1000}`;
  
  // Test data
  const testAircraftType = {
    iata_code: uniqueIataCode,
    icao_code: uniqueIcaoCode,
    name: 'Test Aircraft',
    manufacturer: 'Test Manufacturer',
    model: 'Test-100',
    wingspan_meters: 30,
    length_meters: 35,
    size_category: 'C'
  };
  
  // Clean up after all tests
  afterAll(async () => {
    // Clean up test data
    try {
      if (testAircraftTypeId) {
        await db('aircraft_types').where('id', testAircraftTypeId).del();
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
    await db.destroy();
  });
  
  describe('GET /api/aircraft-types', () => {
    it('should return a list of aircraft types', async () => {
      const response = await request(app).get('/api/aircraft-types');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
  
  describe('POST /api/aircraft-types', () => {
    it('should create a new aircraft type', async () => {
      const response = await request(app)
        .post('/api/aircraft-types')
        .send(testAircraftType);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.iata_code).toBe(testAircraftType.iata_code);
      expect(response.body.icao_code).toBe(testAircraftType.icao_code);
      expect(response.body.name).toBe(testAircraftType.name);
      
      // Save ID for later tests
      testAircraftTypeId = response.body.id;
    });
    
    it('should reject creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/aircraft-types')
        .send({
          // Missing required fields
          manufacturer: 'Test Manufacturer',
          model: 'Test-100'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', true);
    });
    
    it('should reject creation with duplicate IATA code', async () => {
      const response = await request(app)
        .post('/api/aircraft-types')
        .send({
          ...testAircraftType,
          icao_code: 'DIFF' // Different ICAO code
        });
      
      expect(response.status).toBe(409); // Conflict
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('GET /api/aircraft-types/:id', () => {
    it('should return a specific aircraft type', async () => {
      const response = await request(app).get(`/api/aircraft-types/${testAircraftTypeId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testAircraftTypeId);
      expect(response.body.name).toBe(testAircraftType.name);
    });
    
    it('should return 404 for non-existent aircraft type', async () => {
      const response = await request(app).get('/api/aircraft-types/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('PUT /api/aircraft-types/:id', () => {
    it('should update an aircraft type', async () => {
      const updatedData = {
        ...testAircraftType,
        name: 'Updated Test Aircraft',
        wingspan_meters: 32
      };
      
      const response = await request(app)
        .put(`/api/aircraft-types/${testAircraftTypeId}`)
        .send(updatedData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testAircraftTypeId);
      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.wingspan_meters).toBe(updatedData.wingspan_meters);
    });
    
    it('should return 404 for updating non-existent aircraft type', async () => {
      const response = await request(app)
        .put('/api/aircraft-types/9999')
        .send(testAircraftType);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
  
  describe('DELETE /api/aircraft-types/:id', () => {
    it('should delete an aircraft type', async () => {
      const response = await request(app).delete(`/api/aircraft-types/${testAircraftTypeId}`);
      
      expect(response.status).toBe(204);
      
      // Verify it's gone
      const getResponse = await request(app).get(`/api/aircraft-types/${testAircraftTypeId}`);
      expect(getResponse.status).toBe(404);
      
      // Clear ID as we've deleted it
      testAircraftTypeId = null;
    });
    
    it('should return 404 for deleting non-existent aircraft type', async () => {
      const response = await request(app).delete('/api/aircraft-types/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
    });
  });
}); 