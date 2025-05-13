/**
 * API client for flight upload endpoints
 */
import { API_BASE_URL } from '../config';

/**
 * Upload a flight data file
 * @param {File} file - The CSV file to upload
 * @returns {Promise<Object>} Upload result with ID
 */
export const uploadFlightData = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Ensure no duplicated API prefix
    const endpoint = API_BASE_URL.endsWith('/api') ? '/flights/upload' : '/api/flights/upload';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type when using FormData - browser will set it with boundary
      },
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to upload file';
      } catch (e) {
        errorMessage = 'Failed to upload file';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Get upload status
 * @param {string|number} uploadId - Upload ID
 * @returns {Promise<Object>} Upload status
 */
export const getUploadStatus = async (uploadId) => {
  try {
    // Ensure no duplicated API prefix
    const endpoint = API_BASE_URL.endsWith('/api') 
      ? `/flights/upload/${uploadId}/status` 
      : `/api/flights/upload/${uploadId}/status`;
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to get upload status';
      } catch (e) {
        errorMessage = 'Failed to get upload status';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting upload status:', error);
    throw error;
  }
};

/**
 * Initiate validation for an upload
 * @param {string|number} uploadId - Upload ID
 * @returns {Promise<Object>} Validation result
 */
export const validateFlights = async (uploadId) => {
  try {
    // Ensure no duplicated API prefix
    const endpoint = API_BASE_URL.endsWith('/api') 
      ? `/flights/upload/${uploadId}/validate` 
      : `/api/flights/upload/${uploadId}/validate`;
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to validate flights';
      } catch (e) {
        errorMessage = 'Failed to validate flights';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error validating flights:', error);
    throw error;
  }
};

/**
 * Get validation results for an upload
 * @param {string|number} uploadId - Upload ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Results per page (default: 100)
 * @param {string} options.flightNature - Filter by flight nature (A/D)
 * @param {string} options.validationStatus - Filter by validation status
 * @param {string} options.sort - Field to sort by
 * @param {string} options.direction - Sort direction ('asc' or 'desc')
 * @returns {Promise<Object>} Validation results with pagination
 */
export const getValidationResults = async (uploadId, options = {}) => {
  try {
    const { page = 1, limit = 100, flightNature, validationStatus, sort, direction } = options;
    
    // Ensure no duplicated API prefix
    const endpoint = API_BASE_URL.endsWith('/api') 
      ? `/flights/upload/${uploadId}/validation` 
      : `/api/flights/upload/${uploadId}/validation`;
    
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);
    
    if (flightNature) {
      url.searchParams.append('flightNature', flightNature);
    }
    
    if (validationStatus) {
      url.searchParams.append('validationStatus', validationStatus);
    }
    
    if (sort) {
      url.searchParams.append('sort', sort);
    }
    
    if (direction) {
      url.searchParams.append('direction', direction);
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to get validation results';
      } catch (e) {
        errorMessage = 'Failed to get validation results';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting validation results:', error);
    throw error;
  }
};

/**
 * Get arrival flights with validation status 
 * @param {string|number} uploadId - Upload ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Results per page (default: 100)
 * @param {string} options.validationStatus - Filter by validation status
 * @param {string} options.sort - Field to sort by (default: 'scheduled_datetime')
 * @param {string} options.direction - Sort direction (default: 'asc')
 * @returns {Promise<Object>} Validation results with pagination
 */
export const getArrivalFlights = async (uploadId, options = {}) => {
  try {
    const { page = 1, limit = 100, validationStatus, sort = 'scheduled_datetime', direction = 'asc' } = options;
    
    const url = new URL(`${API_BASE_URL}/api/flights/upload/${uploadId}/validation/arrivals`);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);
    
    if (validationStatus) {
      url.searchParams.append('validationStatus', validationStatus);
    }
    
    if (sort) {
      url.searchParams.append('sort', sort);
    }
    
    if (direction) {
      url.searchParams.append('direction', direction);
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to get arrival flights';
      } catch (e) {
        errorMessage = 'Failed to get arrival flights';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting arrival flights:', error);
    throw error;
  }
};

/**
 * Get departure flights with validation status
 * @param {string|number} uploadId - Upload ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Results per page (default: 100)
 * @param {string} options.validationStatus - Filter by validation status
 * @param {string} options.sort - Field to sort by (default: 'scheduled_datetime')
 * @param {string} options.direction - Sort direction (default: 'asc')
 * @returns {Promise<Object>} Validation results with pagination
 */
export const getDepartureFlights = async (uploadId, options = {}) => {
  try {
    const { page = 1, limit = 100, validationStatus, sort = 'scheduled_datetime', direction = 'asc' } = options;
    
    const url = new URL(`${API_BASE_URL}/api/flights/upload/${uploadId}/validation/departures`);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);
    
    if (validationStatus) {
      url.searchParams.append('validationStatus', validationStatus);
    }
    
    if (sort) {
      url.searchParams.append('sort', sort);
    }
    
    if (direction) {
      url.searchParams.append('direction', direction);
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to get departure flights';
      } catch (e) {
        errorMessage = 'Failed to get departure flights';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting departure flights:', error);
    throw error;
  }
};

/**
 * Get validation statistics
 * @param {string|number} uploadId - Upload ID
 * @returns {Promise<Object>} Validation statistics
 */
export const getValidationStats = async (uploadId) => {
  try {
    // Ensure no duplicated API prefix
    const endpoint = API_BASE_URL.endsWith('/api') 
      ? `/flights/upload/${uploadId}/validation/stats` 
      : `/api/flights/upload/${uploadId}/validation/stats`;
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to get validation statistics';
      } catch (e) {
        errorMessage = 'Failed to get validation statistics';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting validation statistics:', error);
    throw error;
  }
};

/**
 * Approve flights for import
 * @param {string|number} uploadId - Upload ID
 * @param {Object} options - Approval options
 * @param {Array<number>} options.flightIds - Array of flight IDs to approve
 * @param {boolean} options.approveAll - Whether to approve all flights
 * @param {boolean} options.excludeInvalid - Whether to exclude invalid flights
 * @returns {Promise<Object>} Approval result
 */
export const approveFlights = async (uploadId, options) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/flights/upload/${uploadId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(options)
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to approve flights';
      } catch (e) {
        errorMessage = 'Failed to approve flights';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error approving flights:', error);
    throw error;
  }
};

/**
 * Export validation report
 * @param {string|number} uploadId - Upload ID
 * @param {Object} options - Export options
 * @param {string} options.format - Export format (csv, xlsx, json)
 * @param {string} options.flightNature - Filter by flight nature (A/D)
 * @param {boolean} options.includeValid - Whether to include valid flights
 * @param {boolean} options.includeInvalid - Whether to include invalid flights
 * @returns {Promise<Blob>} Report file as Blob
 */
export const exportValidationReport = async (uploadId, options = {}) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (options.format) {
      queryParams.append('format', options.format);
    }
    
    if (options.flightNature) {
      queryParams.append('flightNature', options.flightNature);
    }
    
    if (options.includeValid !== undefined) {
      queryParams.append('includeValid', options.includeValid);
    }
    
    if (options.includeInvalid !== undefined) {
      queryParams.append('includeInvalid', options.includeInvalid);
    }
    
    const url = `${API_BASE_URL}/api/flights/upload/${uploadId}/validation/export?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to export validation report';
      } catch (e) {
        errorMessage = 'Failed to export validation report';
      }
      throw new Error(errorMessage);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error exporting validation report:', error);
    throw error;
  }
};

/**
 * Get all flight uploads
 * @returns {Promise<Object>} List of uploads
 */
export const getAllUploads = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/flights/upload`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to get uploads list';
      } catch (e) {
        errorMessage = 'Failed to get uploads list';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting uploads list:', error);
    throw error;
  }
};

/**
 * Delete a flight upload and all associated flights
 * @param {string|number} uploadId - Upload ID to delete
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFlightUpload = async (uploadId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/flights/upload/${uploadId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to delete flight upload';
      } catch (e) {
        errorMessage = 'Failed to delete flight upload';
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting flight upload:', error);
    throw error;
  }
}; 