// Mock API client for tests
const apiClientMock = {
  // Mock API methods
  getTerminals: jest.fn().mockResolvedValue({ data: [] }),
  getPiers: jest.fn().mockResolvedValue({ data: [] }),
  getPiersByTerminal: jest.fn().mockResolvedValue({ data: [] }),
  getStands: jest.fn().mockResolvedValue({ data: [] }),
  getStandsByPier: jest.fn().mockResolvedValue({ data: [] }),
  getStand: jest.fn().mockResolvedValue({ data: {} }),
  createStand: jest.fn().mockResolvedValue({ data: {} }),
  updateStand: jest.fn().mockResolvedValue({ data: {} }),
  deleteStand: jest.fn().mockResolvedValue({ status: 204 }),
  getAircraftTypes: jest.fn().mockResolvedValue({ data: [] }),
  getAircraftType: jest.fn().mockResolvedValue({ data: {} }),
  createAircraftType: jest.fn().mockResolvedValue({ data: {} }),
  updateAircraftType: jest.fn().mockResolvedValue({ data: {} }),
  deleteAircraftType: jest.fn().mockResolvedValue({ status: 204 }),
  getStandConstraints: jest.fn().mockResolvedValue({ data: [] }),
  getStandConstraintsByStand: jest.fn().mockResolvedValue({ data: [] }),
  getStandConstraintsByAircraft: jest.fn().mockResolvedValue({ data: [] }),
  createStandConstraint: jest.fn().mockResolvedValue({ data: {} }),
  updateStandConstraint: jest.fn().mockResolvedValue({ data: {} }),
  deleteStandConstraint: jest.fn().mockResolvedValue({ status: 204 }),
  
  // Mock the interceptors
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn(),
    },
  },
  
  // Basic methods
  get: jest.fn().mockResolvedValue({ data: [] }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ status: 204 }),
};

export default apiClientMock; 