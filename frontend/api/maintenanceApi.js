/**
 * API client for maintenance endpoints
 */
import { API_BASE_URL } from '../config';

/**
 * Get all maintenance requests with optional filters
 * @param {Object} filters - Optional filters
 * @param {string} filters.standId - Filter by stand ID
 * @param {string} filters.status - Filter by status ID
 * @param {string} filters.startDate - Filter by start date
 * @param {string} filters.endDate - Filter by end date
 * @param {string} filters.priority - Filter by priority
 * @returns {Promise<Array>} Array of maintenance requests
 */
export const getMaintenanceRequests = async (filters = {}) => {
  try {
    const url = new URL(`${API_BASE_URL}/maintenance/requests`);
    
    // Add filters to URL
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to retrieve maintenance requests');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting maintenance requests:', error);
    throw error;
  }
};

/**
 * Get a specific maintenance request by ID
 * @param {string} id - Maintenance request ID
 * @returns {Promise<Object>} Maintenance request data
 */
export const getMaintenanceRequestById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/requests/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to retrieve maintenance request');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting maintenance request ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new maintenance request
 * @param {Object} requestData - Maintenance request data
 * @returns {Promise<Object>} Created maintenance request
 */
export const createMaintenanceRequest = async (requestData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create maintenance request');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    throw error;
  }
};

/**
 * Update an existing maintenance request
 * @param {string} id - Maintenance request ID
 * @param {Object} requestData - Updated maintenance request data
 * @returns {Promise<Object>} Updated maintenance request
 */
export const updateMaintenanceRequest = async (id, requestData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/requests/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update maintenance request');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating maintenance request ${id}:`, error);
    throw error;
  }
};

/**
 * Update the status of a maintenance request
 * @param {string} id - Maintenance request ID
 * @param {number} statusId - New status ID
 * @param {string} comment - Optional comment
 * @returns {Promise<Object>} Updated maintenance request
 */
export const updateRequestStatus = async (id, statusId, comment = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/requests/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status_id: statusId, comment })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update request status');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating status for request ${id}:`, error);
    throw error;
  }
};

/**
 * Create an approval for a maintenance request
 * @param {Object} approvalData - Approval data
 * @returns {Promise<Object>} Created approval
 */
export const createApproval = async (approvalData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(approvalData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create approval');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating approval:', error);
    throw error;
  }
};

/**
 * Get capacity impact for a specific maintenance request
 * @param {string} requestId - Maintenance request ID
 * @param {Object} options - Optional parameters
 * @param {string} options.startDate - Override start date (ISO format)
 * @param {string} options.endDate - Override end date (ISO format)
 * @returns {Promise<Object>} Capacity impact analysis
 */
export const getRequestCapacityImpact = async (requestId, options = {}) => {
  try {
    const url = new URL(`${API_BASE_URL}/api/maintenance/requests/${requestId}/capacity-impact`);
    
    // Add optional parameters
    if (options.startDate) {
      url.searchParams.append('startDate', options.startDate);
    }
    if (options.endDate) {
      url.searchParams.append('endDate', options.endDate);
    }
    
    console.log('Sending capacity impact request to:', url.toString());
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to retrieve capacity impact');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting capacity impact for request ${requestId}:`, error);
    throw error;
  }
};

/**
 * Get maintenance status types
 * @returns {Promise<Array>} Array of status types
 */
export const getStatusTypes = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/status-types`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to retrieve status types');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting status types:', error);
    throw error;
  }
}; 