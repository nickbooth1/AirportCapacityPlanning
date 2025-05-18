/**
 * Proactive Insights API Client
 * 
 * Client-side API functions for interacting with the proactive insights backend
 */

import axios from 'axios';

const BASE_URL = '/api/insights';

/**
 * Get active insights with optional filtering
 * 
 * @param {Object} options - Query options
 * @param {string} [options.airportId] - Filter by airport ID
 * @param {string|Array} [options.category] - Filter by category or categories
 * @param {string} [options.priority] - Filter by minimum priority level
 * @param {string} [options.status] - Filter by status
 * @param {number} [options.limit=10] - Limit number of results
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {boolean} [options.includeExpired=false] - Include expired insights
 * @returns {Promise<Object>} - Object containing insights and metadata
 */
export const getInsights = async (options = {}) => {
  try {
    // Build query parameters
    const params = { ...options };
    
    // Make API request
    const response = await axios.get(BASE_URL, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching insights:', error);
    throw error;
  }
};

/**
 * Get a specific insight by ID
 * 
 * @param {string} insightId - The insight ID
 * @returns {Promise<Object>} - The insight data
 */
export const getInsightById = async (insightId) => {
  try {
    const response = await axios.get(`${BASE_URL}/${insightId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching insight ${insightId}:`, error);
    throw error;
  }
};

/**
 * Generate insights for an airport
 * 
 * @param {string} airportId - The airport ID
 * @param {string} [type] - The type of insights to generate (capacity, maintenance, flight_pattern, or all)
 * @returns {Promise<Object>} - The generated insights
 */
export const generateInsights = async (airportId, type = null) => {
  try {
    const params = type ? { type } : {};
    const response = await axios.post(`${BASE_URL}/generate/${airportId}`, null, { params });
    return response.data;
  } catch (error) {
    console.error(`Error generating insights for airport ${airportId}:`, error);
    throw error;
  }
};

/**
 * Acknowledge an insight
 * 
 * @param {string} insightId - The insight ID
 * @param {string} userId - The user ID
 * @param {Object} [feedback] - Optional feedback data
 * @returns {Promise<Object>} - The updated insight
 */
export const acknowledgeInsight = async (insightId, userId, feedback = {}) => {
  try {
    const response = await axios.post(`${BASE_URL}/${insightId}/acknowledge`, {
      userId,
      feedback
    });
    return response.data;
  } catch (error) {
    console.error(`Error acknowledging insight ${insightId}:`, error);
    throw error;
  }
};

/**
 * Update an insight's status
 * 
 * @param {string} insightId - The insight ID
 * @param {Object} updateData - Data to update
 * @param {string} [updateData.status] - New status
 * @param {string} [updateData.assignedTo] - User to assign to
 * @param {string} [updateData.comment] - Comment about the update
 * @param {string} updateData.updatedBy - User making the update
 * @returns {Promise<Object>} - The updated insight
 */
export const updateInsight = async (insightId, updateData) => {
  try {
    const response = await axios.put(`${BASE_URL}/${insightId}`, updateData);
    return response.data;
  } catch (error) {
    console.error(`Error updating insight ${insightId}:`, error);
    throw error;
  }
};

/**
 * Execute a recommended action for an insight
 * 
 * @param {string} insightId - The insight ID
 * @param {string} actionId - The action ID
 * @param {Object} parameters - Action parameters
 * @returns {Promise<Object>} - The action execution result
 */
export const executeAction = async (insightId, actionId, parameters = {}) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/${insightId}/actions/${actionId}/execute`,
      { parameters }
    );
    return response.data;
  } catch (error) {
    console.error(`Error executing action ${actionId} for insight ${insightId}:`, error);
    throw error;
  }
};

export default {
  getInsights,
  getInsightById,
  generateInsights,
  acknowledgeInsight,
  updateInsight,
  executeAction
};