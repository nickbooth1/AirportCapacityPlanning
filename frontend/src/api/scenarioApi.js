import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * API client for scenario management
 */
const scenarioApi = {
  /**
   * Create a new scenario
   * @param {Object} data - Scenario data
   * @returns {Promise<Object>} Created scenario
   */
  async createScenario(data) {
    const token = getAuthToken();
    const response = await axios.post(`${API_URL}/api/agent/scenarios`, data, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * Get a scenario by ID
   * @param {string} scenarioId - Scenario ID
   * @returns {Promise<Object>} Scenario details
   */
  async getScenario(scenarioId) {
    const token = getAuthToken();
    const response = await axios.get(`${API_URL}/api/agent/scenarios/${scenarioId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * Update a scenario
   * @param {string} scenarioId - Scenario ID
   * @param {Object} data - Updated scenario data
   * @returns {Promise<Object>} Updated scenario
   */
  async updateScenario(scenarioId, data) {
    const token = getAuthToken();
    const response = await axios.put(`${API_URL}/api/agent/scenarios/${scenarioId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * List scenarios
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} List of scenarios
   */
  async listScenarios(params = {}) {
    const token = getAuthToken();
    const response = await axios.get(`${API_URL}/api/agent/scenarios`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * Calculate a scenario
   * @param {string} scenarioId - Scenario ID
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Calculation status
   */
  async calculateScenario(scenarioId, options = {}) {
    const token = getAuthToken();
    const response = await axios.post(`${API_URL}/api/agent/scenarios/${scenarioId}/calculate`, options, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * Get calculation results
   * @param {string} scenarioId - Scenario ID
   * @param {string} calculationId - Calculation ID
   * @returns {Promise<Object>} Calculation results
   */
  async getCalculation(scenarioId, calculationId) {
    const token = getAuthToken();
    const response = await axios.get(`${API_URL}/api/agent/scenarios/${scenarioId}/calculations/${calculationId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * Compare scenarios
   * @param {Array<string>} scenarioIds - Array of scenario IDs to compare
   * @param {Array<string>} metrics - Metrics to compare
   * @param {Object} timeRange - Time range options
   * @returns {Promise<Object>} Comparison result
   */
  async compareScenarios(scenarioIds, metrics = [], timeRange = {}) {
    const token = getAuthToken();
    const response = await axios.post(`${API_URL}/api/agent/scenarios/compare`, {
      scenarioIds,
      metrics,
      timeRange
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * Get comparison results
   * @param {string} comparisonId - Comparison ID
   * @returns {Promise<Object>} Comparison results
   */
  async getComparison(comparisonId) {
    const token = getAuthToken();
    const response = await axios.get(`${API_URL}/api/agent/scenarios/comparisons/${comparisonId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * List scenario templates
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} List of templates
   */
  async listTemplates(params = {}) {
    const token = getAuthToken();
    const response = await axios.get(`${API_URL}/api/agent/scenarios/templates`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * Get template details
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Template details
   */
  async getTemplate(templateId) {
    const token = getAuthToken();
    const response = await axios.get(`${API_URL}/api/agent/scenarios/templates/${templateId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * Create scenario from template
   * @param {string} templateId - Template ID
   * @param {Object} data - Scenario data
   * @returns {Promise<Object>} Created scenario
   */
  async createFromTemplate(templateId, data) {
    const token = getAuthToken();
    const response = await axios.post(`${API_URL}/api/agent/scenarios/templates/${templateId}/create`, data, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
  
  /**
   * Delete a scenario
   * @param {string} scenarioId - Scenario ID
   * @returns {Promise<Object>} Delete status
   */
  async deleteScenario(scenarioId) {
    const token = getAuthToken();
    const response = await axios.delete(`${API_URL}/api/agent/scenarios/${scenarioId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};

export default scenarioApi;