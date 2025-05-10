import api from './api';

/**
 * Get all stands
 * @returns {Promise<Array>} List of stands
 */
export const getStands = async () => {
  const response = await api.get('/stands');
  return response.data;
};

/**
 * Get a stand by ID
 * @param {number} id - The stand ID
 * @returns {Promise<Object>} The stand
 */
export const getStandById = async (id) => {
  const response = await api.get(`/stands/${id}`);
  return response.data;
};

/**
 * Get active stands only
 * @returns {Promise<Array>} List of active stands
 */
export const getActiveStands = async () => {
  const response = await api.get('/stands');
  return response.data.filter(stand => stand.is_active);
}; 