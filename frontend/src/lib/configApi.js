import api from './api';

// Operational Settings

/**
 * Get the operational settings
 * @returns {Promise<Object>} The settings data
 */
export const getOperationalSettings = async () => {
  const response = await api.get('/config/settings');
  return response.data;
};

/**
 * Update the operational settings
 * @param {Object} settings - The settings to update
 * @returns {Promise<Object>} The updated settings
 */
export const updateOperationalSettings = async (settings) => {
  const response = await api.put('/config/settings', settings);
  return response.data;
};

// Turnaround Rules

/**
 * Get all turnaround rules
 * @returns {Promise<Array>} List of turnaround rules
 */
export const getAllTurnaroundRules = async () => {
  const response = await api.get('/config/turnaround-rules');
  return response.data;
};

/**
 * Get a turnaround rule by aircraft type ID
 * @param {number} aircraftTypeId - The aircraft type ID
 * @returns {Promise<Object>} The turnaround rule
 */
export const getTurnaroundRuleByAircraftTypeId = async (aircraftTypeId) => {
  const response = await api.get(`/config/turnaround-rules/${aircraftTypeId}`);
  return response.data;
};

/**
 * Create a new turnaround rule
 * @param {Object} ruleData - The rule data
 * @returns {Promise<Object>} The created rule
 */
export const createTurnaroundRule = async (ruleData) => {
  const response = await api.post('/config/turnaround-rules', ruleData);
  return response.data;
};

/**
 * Update a turnaround rule
 * @param {number} aircraftTypeId - The aircraft type ID
 * @param {Object} ruleData - The rule data
 * @returns {Promise<Object>} The updated rule
 */
export const updateTurnaroundRule = async (aircraftTypeId, ruleData) => {
  const response = await api.put(`/config/turnaround-rules/${aircraftTypeId}`, ruleData);
  return response.data;
};

/**
 * Delete a turnaround rule
 * @param {number} aircraftTypeId - The aircraft type ID
 * @returns {Promise<void>}
 */
export const deleteTurnaroundRule = async (aircraftTypeId) => {
  await api.delete(`/config/turnaround-rules/${aircraftTypeId}`);
};

// Time Slots

/**
 * Get all time slots
 * @returns {Promise<Array>} List of time slots
 */
export const getTimeSlots = async () => {
  const response = await api.get('/config/time-slots');
  return response.data;
};

/**
 * Get active time slots only
 * @returns {Promise<Array>} List of active time slots
 */
export const getActiveTimeSlots = async () => {
  const response = await api.get('/config/time-slots/active');
  return response.data;
};

/**
 * Get a time slot by ID
 * @param {number} id - The time slot ID
 * @returns {Promise<Object>} The time slot
 */
export const getTimeSlotById = async (id) => {
  const response = await api.get(`/config/time-slots/${id}`);
  return response.data;
};

/**
 * Create a new time slot
 * @param {Object} slotData - The time slot data
 * @returns {Promise<Object>} The created time slot
 */
export const createTimeSlot = async (slotData) => {
  const response = await api.post('/config/time-slots', slotData);
  return response.data;
};

/**
 * Update a time slot
 * @param {number} id - The time slot ID
 * @param {Object} slotData - The time slot data
 * @returns {Promise<Object>} The updated time slot
 */
export const updateTimeSlot = async (id, slotData) => {
  const response = await api.put(`/config/time-slots/${id}`, slotData);
  return response.data;
};

/**
 * Delete a time slot
 * @param {number} id - The time slot ID
 * @returns {Promise<void>}
 */
export const deleteTimeSlot = async (id) => {
  await api.delete(`/config/time-slots/${id}`);
}; 