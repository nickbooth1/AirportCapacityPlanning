import api from './api';

/**
 * Get capacity settings
 * @returns {Promise<Object>} The capacity settings
 */
export const getCapacitySettings = async () => {
  const response = await api.get('/capacity/settings');
  return response.data;
};

/**
 * Calculate stand capacity with specified options
 * @param {Object} options - The calculation options
 * @returns {Promise<Object>} The calculation result
 */
export const calculateStandCapacity = async (options) => {
  // Convert options to query parameters
  const params = new URLSearchParams();
  if (options.standIds && options.standIds.length > 0) {
    params.append('standIds', options.standIds.join(','));
  }
  if (options.timeSlotIds && options.timeSlotIds.length > 0) {
    params.append('timeSlotIds', options.timeSlotIds.join(','));
  }
  params.append('useDefinedTimeSlots', options.useDefinedTimeSlots.toString());
  if (options.date) {
    params.append('date', options.date);
  }
  
  const response = await api.get(`/capacity/stand-capacity?${params.toString()}`);
  return response.data;
};

/**
 * Get stand capacity for a time range and optional filters
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @param {number[]} [params.standIds] - Optional stand IDs to filter
 * @param {number[]} [params.terminalIds] - Optional terminal IDs to filter
 * @param {number[]} [params.pierIds] - Optional pier IDs to filter
 * @returns {Promise<Object>} The capacity data
 */
export const getStandCapacity = async (params) => {
  const queryParams = new URLSearchParams(params).toString();
  const response = await api.get(`/capacity/stand-capacity?${queryParams}`);
  return response.data;
};

/**
 * Get stand capacity aggregated by time slot
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @param {number[]} [params.standIds] - Optional stand IDs to filter
 * @param {number[]} [params.terminalIds] - Optional terminal IDs to filter
 * @param {number[]} [params.pierIds] - Optional pier IDs to filter
 * @returns {Promise<Object>} The capacity data by time slot
 */
export const getStandCapacityByTimeSlot = async (params) => {
  const queryParams = new URLSearchParams(params).toString();
  const response = await api.get(`/capacity/stand-capacity/by-time-slot?${queryParams}`);
  return response.data;
};

/**
 * Get stand capacity aggregated by aircraft type
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @param {number[]} [params.standIds] - Optional stand IDs to filter
 * @param {number[]} [params.terminalIds] - Optional terminal IDs to filter
 * @param {number[]} [params.pierIds] - Optional pier IDs to filter
 * @returns {Promise<Object>} The capacity data by aircraft type
 */
export const getStandCapacityByAircraftType = async (params) => {
  const queryParams = new URLSearchParams(params).toString();
  const response = await api.get(`/capacity/stand-capacity/by-aircraft-type?${queryParams}`);
  return response.data;
};

/**
 * Calculate stand capacity using the NEW Stand Capacity Tool
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} The capacity calculation results
 */
export const calculateNewStandCapacity = async (options = {}) => {
  try {
    const response = await api.post('/capacity/calculate', options);
    return response.data;
  } catch (error) {
    console.error('Error calculating capacity with new tool:', error);
    throw error;
  }
};

/**
 * Get the latest stand capacity results
 * @returns {Promise<Object>} The latest saved capacity results
 */
export const getLatestCapacityResults = async () => {
  try {
    console.log('Fetching latest capacity results from API');
    const response = await api.get('/capacity/stand-capacity/latest');
    console.log('Raw API response:', response);
    
    // Check if the API call was successful but no results were found
    if (response.data && response.data.success === false) {
      console.log('No capacity results found:', response.data.message);
      return null;
    }
    
    // Return the data property for successful responses
    if (response.data && response.data.success === true && response.data.data) {
      console.log('Successfully retrieved capacity results (new format)');
      // Validate critical data
      if (!response.data.data.bestCaseCapacity || !response.data.data.worstCaseCapacity) {
        console.warn('Response missing critical capacity data');
        return null;
      }
      return response.data.data;
    }
    
    // For backward compatibility with older API format
    if (response.data && !response.data.hasOwnProperty('success')) {
      console.log('Retrieved capacity results (legacy format)');
      // Validate critical data
      if (!response.data.bestCaseCapacity || !response.data.worstCaseCapacity) {
        console.warn('Legacy response missing critical capacity data');
        return null;
      }
      return response.data;
    }
    
    console.log('Unexpected response format:', response.data);
    return null;
  } catch (error) {
    console.error('Error fetching latest capacity results:', error);
    throw error;
  }
}; 