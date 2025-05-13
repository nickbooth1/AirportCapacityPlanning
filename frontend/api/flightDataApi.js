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
  },

  /**
   * Process a flight schedule from upload
   * @param {number} uploadId - Upload ID to process
   * @param {Object} options - Processing options
   * @param {boolean} options.skipValidation - Skip validation step
   * @param {boolean} options.skipAllocation - Skip allocation step
   * @param {Object} options.allocationSettings - Custom allocation settings
   * @returns {Promise<Object>} Processing result
   */
  processFlightSchedule: async (uploadId, options = {}) => {
    try {
      // Validate the uploadId to ensure it's a valid number
      const validUploadId = parseInt(uploadId, 10);
      
      if (isNaN(validUploadId) || validUploadId <= 0) {
        throw new Error('Invalid upload ID provided');
      }
      
      // Use the validated upload ID in the request
      const response = await axios.post(`${API_URL}/api/flight-schedules/process/${validUploadId}`, options);
      return response.data;
    } catch (error) {
      console.error('Error processing flight schedule:', error);
      throw error;
    }
  },
  
  /**
   * Get a list of flight schedules
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Promise<Object>} Flight schedules
   */
  getFlightSchedules: async (filters = {}, page = 1, limit = 20) => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      
      if (filters.status) {
        params.append('status', filters.status);
      }
      
      const response = await axios.get(`${API_URL}/api/flight-schedules?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching flight schedules:', error);
      throw error;
    }
  },
  
  /**
   * Get a flight schedule by ID
   * @param {number} id - Schedule ID
   * @returns {Promise<Object>} Flight schedule
   */
  getFlightSchedule: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/flight-schedules/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching flight schedule ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Get allocations for a flight schedule
   * @param {number} scheduleId - Schedule ID
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Promise<Object>} Allocation results
   */
  getScheduleAllocations: async (scheduleId, filters = {}, page = 1, limit = 100) => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      
      if (filters.standId) {
        params.append('standId', filters.standId);
      }
      
      if (filters.flightNature) {
        params.append('flightNature', filters.flightNature);
      }
      
      const response = await axios.get(`${API_URL}/api/flight-schedules/${scheduleId}/allocations?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching allocations for schedule ${scheduleId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get unallocated flights for a schedule
   * @param {number} scheduleId - Schedule ID
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Promise<Object>} Unallocated flights
   */
  getUnallocatedFlights: async (scheduleId, page = 1, limit = 100) => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      
      const response = await axios.get(`${API_URL}/api/flight-schedules/${scheduleId}/unallocated?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching unallocated flights for schedule ${scheduleId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get utilization metrics for a schedule
   * @param {number} scheduleId - Schedule ID
   * @param {Object} params - Query parameters
   * @param {string} params.timePeriod - Time period (daily, hourly)
   * @param {number} params.standId - Filter by stand ID
   * @param {string} params.terminal - Filter by terminal
   * @returns {Promise<Object>} Utilization metrics
   */
  getUtilizationMetrics: async (scheduleId, params = {}) => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (params.timePeriod) {
        queryParams.append('timePeriod', params.timePeriod);
      }
      
      if (params.standId) {
        queryParams.append('standId', params.standId);
      }
      
      if (params.terminal) {
        queryParams.append('terminal', params.terminal);
      }
      
      const response = await axios.get(`${API_URL}/api/flight-schedules/${scheduleId}/utilization?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching utilization metrics for schedule ${scheduleId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get allocation issues for a schedule
   * @param {number} scheduleId - Schedule ID
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Allocation issues
   */
  getAllocationIssues: async (scheduleId, filters = {}) => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.issueType) {
        params.append('issueType', filters.issueType);
      }
      
      if (filters.severity) {
        params.append('severity', filters.severity);
      }
      
      if (filters.resolved !== undefined) {
        params.append('resolved', filters.resolved);
      }
      
      const response = await axios.get(`${API_URL}/api/flight-schedules/${scheduleId}/issues?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching allocation issues for schedule ${scheduleId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get a comprehensive report for a schedule
   * @param {number} scheduleId - Schedule ID
   * @returns {Promise<Object>} Comprehensive report
   */
  getScheduleReport: async (scheduleId) => {
    try {
      const response = await axios.get(`${API_URL}/api/flight-schedules/${scheduleId}/report`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching report for schedule ${scheduleId}:`, error);
      throw error;
    }
  },
  
  /**
   * Update schedule status
   * @param {number} scheduleId - Schedule ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Update result
   */
  updateScheduleStatus: async (scheduleId, status) => {
    try {
      const response = await axios.put(`${API_URL}/api/flight-schedules/${scheduleId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating status for schedule ${scheduleId}:`, error);
      throw error;
    }
  }
};

export default flightDataApi; 