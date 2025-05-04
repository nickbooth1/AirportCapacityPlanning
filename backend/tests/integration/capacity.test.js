/**
 * Integration test for capacity endpoints
 */
const request = require('supertest');
const app = require('../../src/index');
const standCapacityService = require('../../src/services/standCapacityService');

// Mock the service to avoid actual DB calls
jest.mock('../../src/services/standCapacityService');

describe('Capacity API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock implementations
    standCapacityService.calculateCapacity.mockResolvedValue({
      calculation_timestamp: '2024-08-15T10:00:00Z',
      operating_day: '2024-08-15',
      capacity_summary: {
        grand_total: 240,
        total_available_stand_hours: {
          'A': 30,
          'B': 40,
          'C': 50,
          'D': 60,
          'E': 40,
          'F': 20
        }
      },
      capacity_by_hour: [
        {
          hour: 6,
          available_slots: {
            'A': 3,
            'B': 4,
            'C': 5,
            'D': 6,
            'E': 4,
            'F': 2
          }
        }
        // ... truncated for brevity
      ]
    });
    
    standCapacityService.fetchOperationalSettings.mockResolvedValue({
      slot_duration_minutes: 10,
      slot_block_size: 6,
      operating_start_time: '06:00:00',
      operating_end_time: '23:00:00',
      default_gap_minutes: 15
    });
  });
  
  describe('GET /api/capacity/calculate', () => {
    test('should return 200 and capacity data with valid date', async () => {
      const response = await request(app)
        .get('/api/capacity/calculate')
        .query({ date: '2024-08-15' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('calculation_timestamp');
      expect(response.body).toHaveProperty('operating_day', '2024-08-15');
      expect(response.body).toHaveProperty('capacity_summary');
      expect(response.body).toHaveProperty('capacity_by_hour');
      
      expect(standCapacityService.calculateCapacity).toHaveBeenCalledWith('2024-08-15');
    });
    
    test('should return 200 and use default date if none provided', async () => {
      const response = await request(app)
        .get('/api/capacity/calculate');
      
      expect(response.status).toBe(200);
      
      // Should be called with some date in YYYY-MM-DD format
      expect(standCapacityService.calculateCapacity).toHaveBeenCalled();
      const calledWithDate = standCapacityService.calculateCapacity.mock.calls[0][0];
      expect(calledWithDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    
    test('should return 400 with invalid date format', async () => {
      const response = await request(app)
        .get('/api/capacity/calculate')
        .query({ date: 'invalid-date' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid date format');
    });
    
    test('should return 500 when service throws error', async () => {
      standCapacityService.calculateCapacity.mockRejectedValue(new Error('Service error'));
      
      const response = await request(app)
        .get('/api/capacity/calculate')
        .query({ date: '2024-08-15' });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to calculate capacity');
    });
  });
  
  describe('GET /api/capacity/settings', () => {
    test('should return 200 and capacity settings', async () => {
      const response = await request(app)
        .get('/api/capacity/settings');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('slot_duration_minutes', 10);
      expect(response.body).toHaveProperty('slot_block_size', 6);
      expect(response.body).toHaveProperty('operating_start_time', '06:00:00');
      expect(response.body).toHaveProperty('operating_end_time', '23:00:00');
      expect(response.body).toHaveProperty('default_gap_minutes', 15);
      
      expect(standCapacityService.fetchOperationalSettings).toHaveBeenCalled();
    });
    
    test('should return 500 when service throws error', async () => {
      standCapacityService.fetchOperationalSettings.mockRejectedValue(new Error('Service error'));
      
      const response = await request(app)
        .get('/api/capacity/settings');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to retrieve capacity settings');
    });
  });
}); 