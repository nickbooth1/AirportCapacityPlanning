const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

// Mock database methods
jest.mock('../src/db', () => ({
  testConnection: jest.fn().mockResolvedValue(true),
  transaction: jest.fn().mockImplementation(cb => cb({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue({ id: 1, base_airport_id: 1 }),
    insert: jest.fn().mockResolvedValue([1]),
    update: jest.fn().mockResolvedValue(1),
    returning: jest.fn().mockReturnThis(),
    del: jest.fn().mockResolvedValue(1),
    orderBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis()
  }))
}));

// Mock the database queries
jest.mock('../src/services/airportConfigService', () => ({
  getConfig: jest.fn().mockResolvedValue({
    id: 1,
    baseAirport: {
      id: 1,
      name: 'London Heathrow',
      iata_code: 'LHR',
      country: 'GB'
    }
  }),
  updateConfig: jest.fn().mockResolvedValue({
    id: 1,
    baseAirport: {
      id: 2,
      name: 'JFK International',
      iata_code: 'JFK',
      country: 'US'
    }
  }),
  getAllocations: jest.fn().mockResolvedValue([
    {
      id: 1,
      airline_id: 1,
      airline_name: 'British Airways',
      airline_iata_code: 'BA',
      terminal_id: 1,
      terminal_name: 'Terminal 1',
      terminal_code: 'T1',
      gha_id: 1,
      gha_name: 'Swissport'
    }
  ]),
  addAllocation: jest.fn().mockResolvedValue({
    id: 2,
    airline_id: 2,
    airline_name: 'American Airlines',
    airline_iata_code: 'AA',
    terminal_id: 2,
    terminal_name: 'Terminal 2',
    terminal_code: 'T2',
    gha_id: 2,
    gha_name: 'Menzies Aviation'
  }),
  updateAllocation: jest.fn().mockResolvedValue({
    id: 1,
    airline_id: 1,
    airline_name: 'British Airways',
    airline_iata_code: 'BA',
    terminal_id: 2,
    terminal_name: 'Terminal 2',
    terminal_code: 'T2',
    gha_id: 1,
    gha_name: 'Swissport'
  }),
  deleteAllocation: jest.fn().mockResolvedValue(true),
  getOneAllocation: jest.fn().mockResolvedValue({
    id: 1,
    airline_id: 1,
    airline_name: 'British Airways',
    airline_iata_code: 'BA',
    terminal_id: 1,
    terminal_name: 'Terminal 1',
    terminal_code: 'T1',
    gha_id: 1,
    gha_name: 'Swissport'
  })
}));

describe('Airport Configuration API', () => {
  afterAll(async () => {
    // Close database connection after tests
    if (db.destroy) {
      await db.destroy();
    }
  });

  describe('GET /api/airport-config', () => {
    it('should return the current airport configuration', async () => {
      const res = await request(app).get('/api/airport-config');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.baseAirport.iata_code).toEqual('LHR');
    });
  });

  describe('PUT /api/airport-config', () => {
    it('should update the base airport', async () => {
      const res = await request(app)
        .put('/api/airport-config')
        .send({
          baseAirportId: 2
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.baseAirport.iata_code).toEqual('JFK');
    });

    it('should return 400 if baseAirportId is not provided', async () => {
      const res = await request(app)
        .put('/api/airport-config')
        .send({});
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
    });
  });

  describe('GET /api/airport-config/allocations', () => {
    it('should return all airline terminal allocations', async () => {
      const res = await request(app).get('/api/airport-config/allocations');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].airline_iata_code).toEqual('BA');
    });
  });

  describe('POST /api/airport-config/allocations', () => {
    it('should add a new airline terminal allocation', async () => {
      const res = await request(app)
        .post('/api/airport-config/allocations')
        .send({
          airlineId: 2,
          terminalId: 2,
          ghaId: 2
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.airline_iata_code).toEqual('AA');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/airport-config/allocations')
        .send({
          airlineId: 2
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
    });
  });

  describe('PUT /api/airport-config/allocations/:id', () => {
    it('should update an airline terminal allocation', async () => {
      const res = await request(app)
        .put('/api/airport-config/allocations/1')
        .send({
          airlineId: 1,
          terminalId: 2,
          ghaId: 1
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.terminal_id).toEqual(2);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .put('/api/airport-config/allocations/1')
        .send({
          airlineId: 1
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('error');
    });
  });

  describe('DELETE /api/airport-config/allocations/:id', () => {
    it('should delete an airline terminal allocation', async () => {
      const res = await request(app)
        .delete('/api/airport-config/allocations/1');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.message).toEqual('Allocation deleted successfully');
    });
  });
}); 