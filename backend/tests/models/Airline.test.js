const Airline = require('../../src/models/Airline');

describe('Airline Model', () => {
  let mockAirline;

  beforeEach(() => {
    // Mock the static methods on the Airline model
    mockAirline = {
      id: 1,
      name: 'Test Airline',
      iata_code: 'TA',
      icao_code: 'TST',
      callsign: 'TESTAIR',
      country: 'Test Country',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Mock query builder methods
    const mockQueryBuilder = {
      findOne: jest.fn().mockResolvedValue(mockAirline),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis()
    };

    // Mock the query method
    Airline.query = jest.fn().mockReturnValue(mockQueryBuilder);
  });

  describe('findByIATA', () => {
    it('should find an airline by IATA code', async () => {
      const result = await Airline.findByIATA('TA');
      expect(Airline.query).toHaveBeenCalled();
      expect(result).toEqual(mockAirline);
    });
  });

  describe('findByICAO', () => {
    it('should find an airline by ICAO code', async () => {
      const result = await Airline.findByICAO('TST');
      expect(Airline.query).toHaveBeenCalled();
      expect(result).toEqual(mockAirline);
    });
  });

  describe('validateAirlineReference', () => {
    it('should return true for valid IATA code', async () => {
      const result = await Airline.validateAirlineReference('TA', 'IATA');
      expect(result).toBe(true);
    });

    it('should return true for valid ICAO code', async () => {
      const result = await Airline.validateAirlineReference('TST', 'ICAO');
      expect(result).toBe(true);
    });

    it('should return false for empty code', async () => {
      const result = await Airline.validateAirlineReference('', 'IATA');
      expect(result).toBe(false);
    });

    it('should return false for invalid type', async () => {
      const result = await Airline.validateAirlineReference('TA', 'INVALID');
      expect(result).toBe(false);
    });
  });

  describe('findAirlines', () => {
    it('should return all airlines when no query is provided', async () => {
      // Mock the findAirlines method to return an array
      Airline.query = jest.fn().mockReturnValue([mockAirline]);
      
      const result = await Airline.findAirlines();
      expect(Airline.query).toHaveBeenCalled();
      expect(result).toEqual([mockAirline]);
    });

    it('should search airlines by name, IATA, ICAO, or country when query is provided', async () => {
      const result = await Airline.findAirlines('Test');
      expect(Airline.query).toHaveBeenCalled();
      expect(result).toEqual(mockAirline);
    });
  });

  describe('lifecycle hooks', () => {
    it('should set created_at and updated_at on insert', () => {
      const airline = new Airline();
      airline.$beforeInsert();
      
      expect(airline.created_at).toBeDefined();
      expect(airline.updated_at).toBeDefined();
    });

    it('should update updated_at on update', () => {
      const airline = new Airline();
      airline.updated_at = '2020-01-01T00:00:00.000Z';
      
      airline.$beforeUpdate();
      expect(airline.updated_at).not.toBe('2020-01-01T00:00:00.000Z');
    });
  });
}); 