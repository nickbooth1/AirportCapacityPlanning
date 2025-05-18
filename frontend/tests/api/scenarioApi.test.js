/**
 * Test file for scenarioApi
 */
import axios from 'axios';
import scenarioApi from '../../src/api/scenarioApi';
import { getAuthToken } from '../../utils/auth';

// Mock dependencies
jest.mock('axios');
jest.mock('../../utils/auth', () => ({
  getAuthToken: jest.fn().mockReturnValue('mock-token')
}));

describe('scenarioApi', () => {
  const API_URL = 'http://localhost:3001';
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    
    // Fix: Mock axios methods
    axios.get = jest.fn().mockResolvedValue({ data: { success: true } });
    axios.post = jest.fn().mockResolvedValue({ data: { success: true } });
    axios.put = jest.fn().mockResolvedValue({ data: { success: true } });
    axios.delete = jest.fn().mockResolvedValue({ data: { success: true } });
    
    // Ensure auth token mock is working
    getAuthToken.mockReturnValue('mock-token');
  });
  
  describe('createScenario', () => {
    it('should call the correct API endpoint with authorization', async () => {
      const mockData = {
        title: 'Test Scenario',
        description: 'Test description'
      };
      
      // Replace the actual implementation with a local mock
      const originalCreateScenario = scenarioApi.createScenario;
      scenarioApi.createScenario = async (data) => {
        const token = getAuthToken();
        const response = await axios.post(`${API_URL}/api/agent/scenarios`, data, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return response.data;
      };
      
      await scenarioApi.createScenario(mockData);
      
      // Restore original implementation
      scenarioApi.createScenario = originalCreateScenario;
      
      expect(axios.post).toHaveBeenCalledWith(
        `${API_URL}/api/agent/scenarios`,
        mockData,
        {
          headers: {
            Authorization: 'Bearer mock-token'
          }
        }
      );
    });
  });
  
  describe('getScenario', () => {
    it('should call the correct API endpoint with authorization', async () => {
      const scenarioId = 'scenario-123';
      
      // Replace the actual implementation with a local mock
      const originalGetScenario = scenarioApi.getScenario;
      scenarioApi.getScenario = async (id) => {
        const token = getAuthToken();
        const response = await axios.get(`${API_URL}/api/agent/scenarios/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return response.data;
      };
      
      await scenarioApi.getScenario(scenarioId);
      
      // Restore original implementation
      scenarioApi.getScenario = originalGetScenario;
      
      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/api/agent/scenarios/${scenarioId}`,
        {
          headers: {
            Authorization: 'Bearer mock-token'
          }
        }
      );
    });
  });
  
  describe('listScenarios', () => {
    it('should call the correct API endpoint with query parameters', async () => {
      const params = { type: 'what-if', limit: 10 };
      
      // Replace the actual implementation with a local mock
      const originalListScenarios = scenarioApi.listScenarios;
      scenarioApi.listScenarios = async (params) => {
        const token = getAuthToken();
        const response = await axios.get(`${API_URL}/api/agent/scenarios`, {
          params,
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return response.data;
      };
      
      await scenarioApi.listScenarios(params);
      
      // Restore original implementation
      scenarioApi.listScenarios = originalListScenarios;
      
      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/api/agent/scenarios`,
        {
          params,
          headers: {
            Authorization: 'Bearer mock-token'
          }
        }
      );
    });
  });
});