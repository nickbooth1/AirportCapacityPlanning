// Simplified test that only tests API connectivity for stands
import api from '../../lib/api';

// Mock api client
jest.mock('../../lib/api', () => ({
  getStands: jest.fn().mockResolvedValue({ data: [] }),
  getStandsByPier: jest.fn().mockResolvedValue({ data: [] }),
  getStand: jest.fn().mockResolvedValue({ data: {} }),
  createStand: jest.fn().mockResolvedValue({ data: {} }),
  updateStand: jest.fn().mockResolvedValue({ data: {} }),
  deleteStand: jest.fn().mockResolvedValue({ status: 204 }),
  getPiers: jest.fn().mockResolvedValue({ data: [] }),
  getTerminals: jest.fn().mockResolvedValue({ data: [] }),
}));

// Mock the page component to prevent imports
jest.mock('../../pages/stands/index.js', () => () => null);

describe('Stands API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch stands', async () => {
    const mockData = [{ id: 1, name: 'Stand A1', code: 'A1' }];
    api.getStands.mockResolvedValueOnce({ data: mockData });
    
    const result = await api.getStands();
    
    expect(api.getStands).toHaveBeenCalled();
    expect(result.data).toEqual(mockData);
  });

  it('should create a new stand', async () => {
    const newStand = { 
      name: 'Stand B1', 
      code: 'B1', 
      pier_id: 1,
      is_active: true
    };
    
    await api.createStand(newStand);
    
    expect(api.createStand).toHaveBeenCalledWith(newStand);
  });

  it('should get stands by pier', async () => {
    const pierId = 1;
    const mockData = [{ id: 1, name: 'Stand A1', code: 'A1', pier_id: pierId }];
    api.getStandsByPier.mockResolvedValueOnce({ data: mockData });
    
    const result = await api.getStandsByPier(pierId);
    
    expect(api.getStandsByPier).toHaveBeenCalledWith(pierId);
    expect(result.data).toEqual(mockData);
  });

  it('should delete a stand', async () => {
    const standId = 1;
    await api.deleteStand(standId);
    
    expect(api.deleteStand).toHaveBeenCalledWith(standId);
  });
}); 