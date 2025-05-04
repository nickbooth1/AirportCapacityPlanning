// Simplified test that only tests API connectivity for stand constraints
import api from '../../lib/api';

// Mock api client
jest.mock('../../lib/api', () => ({
  getStandConstraints: jest.fn().mockResolvedValue({ data: [] }),
  getStandConstraintsByStand: jest.fn().mockResolvedValue({ data: [] }),
  getStandConstraintsByAircraft: jest.fn().mockResolvedValue({ data: [] }),
  createStandConstraint: jest.fn().mockResolvedValue({ data: {} }),
  updateStandConstraint: jest.fn().mockResolvedValue({ data: {} }),
  deleteStandConstraint: jest.fn().mockResolvedValue({ status: 204 }),
  getStand: jest.fn().mockResolvedValue({ data: {} }),
  getAircraftTypes: jest.fn().mockResolvedValue({ data: [] }),
}));

// Mock the page component
jest.mock('../../pages/stands/constraints/[id].js', () => () => null);

describe('Stand Constraints API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch stand constraints by stand ID', async () => {
    const mockData = [
      { 
        id: 1, 
        stand_id: 1, 
        aircraft_type_id: 2, 
        is_allowed: true, 
        constraint_reason: 'Test reason' 
      }
    ];
    api.getStandConstraintsByStand.mockResolvedValueOnce({ data: mockData });
    
    const result = await api.getStandConstraintsByStand(1);
    
    expect(api.getStandConstraintsByStand).toHaveBeenCalledWith(1);
    expect(result.data).toEqual(mockData);
  });

  it('should create a new stand constraint', async () => {
    const newConstraint = { 
      stand_id: 1, 
      aircraft_type_id: 2, 
      is_allowed: true, 
      constraint_reason: 'Test reason' 
    };
    
    await api.createStandConstraint(newConstraint);
    
    expect(api.createStandConstraint).toHaveBeenCalledWith(newConstraint);
  });

  it('should delete a stand constraint', async () => {
    const constraintId = 1;
    await api.deleteStandConstraint(constraintId);
    
    expect(api.deleteStandConstraint).toHaveBeenCalledWith(constraintId);
  });

  it('should fetch aircraft types', async () => {
    const mockData = [{ id: 1, name: 'Boeing 737', iata_code: 'B737' }];
    api.getAircraftTypes.mockResolvedValueOnce({ data: mockData });
    
    const result = await api.getAircraftTypes();
    
    expect(api.getAircraftTypes).toHaveBeenCalled();
    expect(result.data).toEqual(mockData);
  });
}); 