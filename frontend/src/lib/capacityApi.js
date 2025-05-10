import api from './api';

/**
 * Get capacity configuration data
 * @returns {Promise<Object>} The capacity configuration data
 */
export const getCapacitySettings = async () => {
  const response = await api.get('/api/capacity/settings');
  return response.data;
};

/**
 * Calculate stand capacity
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} The capacity calculation results
 */
export const calculateStandCapacity = async (options = {}) => {
  const queryParams = new URLSearchParams();
  
  if (options.standIds) {
    queryParams.append('standIds', options.standIds.join(','));
  }
  
  if (options.timeSlotIds) {
    queryParams.append('timeSlotIds', options.timeSlotIds.join(','));
  }
  
  if (options.useDefinedTimeSlots !== undefined) {
    queryParams.append('useDefinedTimeSlots', options.useDefinedTimeSlots);
  }
  
  if (options.date) {
    queryParams.append('date', options.date);
  }
  
  const response = await api.get(`/api/capacity/stand-capacity?${queryParams}`);
  return response.data;
};

/**
 * Get capacity organized by time slot
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} The capacity calculation results organized by time slot
 */
export const getCapacityByTimeSlot = async (options = {}) => {
  const queryParams = new URLSearchParams();
  
  if (options.standIds) {
    queryParams.append('standIds', options.standIds.join(','));
  }
  
  if (options.timeSlotIds) {
    queryParams.append('timeSlotIds', options.timeSlotIds.join(','));
  }
  
  if (options.useDefinedTimeSlots !== undefined) {
    queryParams.append('useDefinedTimeSlots', options.useDefinedTimeSlots);
  }
  
  if (options.date) {
    queryParams.append('date', options.date);
  }
  
  const response = await api.get(`/api/capacity/stand-capacity/by-time-slot?${queryParams}`);
  return response.data;
};

/**
 * Get capacity organized by aircraft type
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} The capacity calculation results organized by aircraft type
 */
export const getCapacityByAircraftType = async (options = {}) => {
  const queryParams = new URLSearchParams();
  
  if (options.standIds) {
    queryParams.append('standIds', options.standIds.join(','));
  }
  
  if (options.timeSlotIds) {
    queryParams.append('timeSlotIds', options.timeSlotIds.join(','));
  }
  
  if (options.useDefinedTimeSlots !== undefined) {
    queryParams.append('useDefinedTimeSlots', options.useDefinedTimeSlots);
  }
  
  if (options.date) {
    queryParams.append('date', options.date);
  }
  
  const response = await api.get(`/api/capacity/stand-capacity/by-aircraft-type?${queryParams}`);
  return response.data;
}; 