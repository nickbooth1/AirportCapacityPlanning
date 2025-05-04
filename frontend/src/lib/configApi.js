import api from './api';

// Operational Settings

/**
 * Get the operational settings
 * @returns {Promise<Object>} The settings data
 */
export const getOperationalSettings = async () => {
  const response = await api.get('/api/config/settings');
  return response.data;
};

/**
 * Update the operational settings
 * @param {Object} settings - The settings to update
 * @returns {Promise<Object>} The updated settings
 */
export const updateOperationalSettings = async (settings) => {
  const response = await api.put('/api/config/settings', settings);
  return response.data;
};

// Turnaround Rules

/**
 * Get all turnaround rules
 * @returns {Promise<Array>} List of turnaround rules
 */
export const getAllTurnaroundRules = async () => {
  const response = await api.get('/api/config/turnaround-rules');
  return response.data;
};

/**
 * Get a turnaround rule by aircraft type ID
 * @param {number} aircraftTypeId - The aircraft type ID
 * @returns {Promise<Object>} The turnaround rule
 */
export const getTurnaroundRuleByAircraftType = async (aircraftTypeId) => {
  const response = await api.get(`/api/config/turnaround-rules/aircraft-type/${aircraftTypeId}`);
  return response.data;
};

/**
 * Create a new turnaround rule
 * @param {Object} ruleData - The rule data to create
 * @returns {Promise<Object>} The created rule
 */
export const createTurnaroundRule = async (ruleData) => {
  const response = await api.post('/api/config/turnaround-rules', ruleData);
  return response.data;
};

/**
 * Update a turnaround rule
 * @param {number} aircraftTypeId - The aircraft type ID
 * @param {Object} ruleData - The rule data to update
 * @returns {Promise<Object>} The updated rule
 */
export const updateTurnaroundRule = async (aircraftTypeId, ruleData) => {
  const response = await api.put(`/api/config/turnaround-rules/aircraft-type/${aircraftTypeId}`, ruleData);
  return response.data;
};

/**
 * Delete a turnaround rule
 * @param {number} aircraftTypeId - The aircraft type ID
 * @returns {Promise<void>}
 */
export const deleteTurnaroundRule = async (aircraftTypeId) => {
  await api.delete(`/api/config/turnaround-rules/aircraft-type/${aircraftTypeId}`);
}; 