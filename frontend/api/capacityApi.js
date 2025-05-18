/**
 * API client for capacity endpoints
 */
import { API_BASE_URL } from '../config';

/**
 * Calculate stand capacity for a given date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Capacity data
 */
export const calculateCapacity = async (date) => {
  try {
    const url = new URL(`${API_BASE_URL}/api/capacity/calculate`);
    if (date) {
      url.searchParams.append('date', date);
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to calculate capacity');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calculating capacity:', error);
    throw error;
  }
};

/**
 * Get capacity calculation settings
 * @returns {Promise<Object>} Capacity settings
 */
export const getCapacitySettings = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/capacity/settings`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to retrieve capacity settings');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting capacity settings:', error);
    throw error;
  }
};

/**
 * Get capacity impact analysis for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Capacity impact analysis data
 */
export const getCapacityImpactAnalysis = async (startDate, endDate) => {
  try {
    const url = new URL(`${API_BASE_URL}/api/capacity/impact-analysis`);
    url.searchParams.append('startDate', startDate);
    url.searchParams.append('endDate', endDate);
    
    console.log('API Request URL:', url.toString());
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to retrieve capacity impact analysis');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting capacity impact analysis:', error);
    throw error;
  }
}; 