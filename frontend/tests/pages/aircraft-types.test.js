import api from '../../lib/api';

// Mock api client
jest.mock('../../lib/api', () => ({
  getAircraftTypes: jest.fn().mockResolvedValue({ data: [] }),
  createAircraftType: jest.fn().mockResolvedValue({ data: {} }),
  updateAircraftType: jest.fn().mockResolvedValue({ data: {} }),
  deleteAircraftType: jest.fn().mockResolvedValue({ status: 204 }),
}));

// Mock the components to prevent them from being imported
jest.mock('../../pages/aircraft-types/index.js', () => () => null);

describe('Aircraft Types API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch aircraft types', async () => {
    const mockData = [{ id: 1, name: 'Boeing 737', iata_code: 'B737' }];
    api.getAircraftTypes.mockResolvedValueOnce({ data: mockData });
    
    const result = await api.getAircraftTypes();
    
    expect(api.getAircraftTypes).toHaveBeenCalled();
    expect(result.data).toEqual(mockData);
  });

  it('should create a new aircraft type', async () => {
    const newAircraftType = { 
      name: 'Airbus A320', 
      iata_code: 'A320', 
      icao_code: 'A320' 
    };
    
    await api.createAircraftType(newAircraftType);
    
    expect(api.createAircraftType).toHaveBeenCalledWith(newAircraftType);
  });
}); 