import apiClient from '../lib/api';

// Mock the API client
jest.mock('../lib/api');

describe('API Connectivity', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be able to get terminals', async () => {
    apiClient.getTerminals.mockResolvedValueOnce({ data: [{ id: 1, name: 'Terminal 1' }] });
    
    const result = await apiClient.getTerminals();
    
    expect(apiClient.getTerminals).toHaveBeenCalled();
    expect(result.data).toEqual([{ id: 1, name: 'Terminal 1' }]);
  });
}); 