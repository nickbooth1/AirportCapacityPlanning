import axios from 'axios';
import * as flightUploadApi from './flightUploadApi';

const API_URL = ''; // Use relative URLs

/**
 * Flight Data API Service
 */
const flightDataApi = {
  /**
   * Get flights with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} pageSize - Items per page
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - Sort order (asc/desc)
   * @returns {Promise<Object>} Flights data
   */
  getFlights: async (filters = {}, page = 1, pageSize = 20, sortBy = 'scheduled_datetime', sortOrder = 'asc') => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add pagination parameters
      params.append('page', page);
      params.append('pageSize', pageSize);
      
      // Add sorting parameters
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      // Add filter parameters, if provided
      if (filters.searchTerm) {
        params.append('searchTerm', filters.searchTerm);
      }
      
      if (filters.startDate && filters.endDate) {
        params.append('startDate', filters.startDate.toISOString());
        params.append('endDate', filters.endDate.toISOString());
      }
      
      if (filters.flightType && filters.flightType !== 'all') {
        params.append('flightType', filters.flightType);
      }
      
      if (filters.airline && filters.airline !== 'all') {
        params.append('airline', filters.airline);
      }
      
      if (filters.terminal && filters.terminal !== 'all') {
        params.append('terminal', filters.terminal);
      }
      
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      
      if (filters.uploadId && filters.uploadId !== 'all') {
        params.append('uploadId', filters.uploadId);
      }
      
      // Fetch data
      const response = await fetch(`${API_URL}/api/flights?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch flights: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching flights:', error);
      throw error;
    }
  },
  
  /**
   * Get all uploaded flight schedules
   * @returns {Promise<Array>} List of uploaded schedules
   */
  getUploadedSchedules: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/flights/upload`);
      return response.data;
    } catch (error) {
      console.error('Error fetching uploaded schedules:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific flight by ID
   * @param {String} id - Flight ID
   * @returns {Promise<Object>} Flight details
   */
  getFlightById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/flights/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching flight ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Get flight statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Flight statistics
   */
  getFlightStats: async (filters = {}) => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add filter parameters
      if (filters.startDate && filters.endDate) {
        params.append('startDate', filters.startDate.toISOString());
        params.append('endDate', filters.endDate.toISOString());
      }
      
      if (filters.uploadId && filters.uploadId !== 'all') {
        params.append('uploadId', filters.uploadId);
      }
      
      // Fetch data
      const response = await fetch(`${API_URL}/api/flights/stats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch flight statistics: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching flight statistics:', error);
      throw error;
    }
  },
  
  /**
   * Delete flights by ID
   * @param {Array} ids - Array of flight IDs to delete
   * @returns {Promise<Object>} Deletion result
   */
  deleteFlights: async (ids) => {
    try {
      const response = await axios.delete(`${API_URL}/api/flights`, { data: { ids } });
      return response.data;
    } catch (error) {
      console.error('Error deleting flights:', error);
      throw error;
    }
  },
  
  /**
   * Delete a single flight by ID
   * @param {String} id - Flight ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  deleteFlight: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/api/flights/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting flight ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a flight upload and all associated flights
   * @param {number} uploadId - ID of the upload to delete
   * @returns {Promise<Object>} - Result of the deletion
   */
  deleteFlightUpload: async (uploadId) => {
    return flightUploadApi.deleteFlightUpload(uploadId);
  }
};

export default flightDataApi; 