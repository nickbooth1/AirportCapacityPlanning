import axios from 'axios';

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Column Mapping API Client
 */
const columnMappingApi = {
  /**
   * Detect columns from an uploaded file
   * @param {File} file - The file to detect columns from
   * @returns {Promise<Object>} - Column detection result
   */
  detectColumns: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API_URL}/api/column-mapping/detect-columns`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error detecting columns:', error);
      throw error;
    }
  },
  
  /**
   * Detect columns from an existing upload
   * @param {number} uploadId - Upload ID
   * @returns {Promise<Object>} - Column detection result
   */
  detectColumnsFromUpload: async (uploadId) => {
    try {
      const response = await axios.get(`${API_URL}/api/column-mapping/uploads/${uploadId}/columns`);
      return response.data;
    } catch (error) {
      console.error('Error detecting columns from upload:', error);
      throw error;
    }
  },
  
  /**
   * Get required mapping fields
   * @returns {Promise<Object>} - Required mapping fields
   */
  getMappingFields: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/column-mapping/fields`);
      return response.data;
    } catch (error) {
      console.error('Error getting mapping fields:', error);
      throw error;
    }
  },
  
  /**
   * Suggest mappings based on source columns
   * @param {string[]} sourceColumns - Source column names
   * @returns {Promise<Object>} - Suggested mappings
   */
  suggestMappings: async (sourceColumns) => {
    try {
      const response = await axios.post(`${API_URL}/api/column-mapping/suggest`, { sourceColumns });
      return response.data;
    } catch (error) {
      console.error('Error suggesting mappings:', error);
      throw error;
    }
  },
  
  /**
   * Apply mapping to transform data
   * @param {number} uploadId - Upload ID
   * @param {Object} mappingProfile - Mapping profile
   * @returns {Promise<Object>} - Mapping result
   */
  applyMapping: async (uploadId, mappingProfile) => {
    try {
      const response = await axios.post(`${API_URL}/api/column-mapping/apply`, {
        uploadId,
        mappingProfile
      });
      
      return response.data;
    } catch (error) {
      console.error('Error applying mapping:', error);
      throw error;
    }
  },
  
  /**
   * List mapping profiles
   * @returns {Promise<Object>} - List of mapping profiles
   */
  listMappingProfiles: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/column-mapping/profiles`);
      return response.data;
    } catch (error) {
      console.error('Error listing mapping profiles:', error);
      throw error;
    }
  },
  
  /**
   * Create a mapping profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} - Created profile
   */
  createMappingProfile: async (profileData) => {
    try {
      const response = await axios.post(`${API_URL}/api/column-mapping/profiles`, profileData);
      return response.data;
    } catch (error) {
      console.error('Error creating mapping profile:', error);
      throw error;
    }
  },
  
  /**
   * Get a mapping profile
   * @param {number} id - Profile ID
   * @returns {Promise<Object>} - Mapping profile
   */
  getMappingProfile: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/column-mapping/profiles/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting mapping profile:', error);
      throw error;
    }
  },
  
  /**
   * Update a mapping profile
   * @param {number} id - Profile ID
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} - Update result
   */
  updateMappingProfile: async (id, profileData) => {
    try {
      const response = await axios.put(`${API_URL}/api/column-mapping/profiles/${id}`, profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating mapping profile:', error);
      throw error;
    }
  },
  
  /**
   * Delete a mapping profile
   * @param {number} id - Profile ID
   * @returns {Promise<Object>} - Deletion result
   */
  deleteMappingProfile: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/api/column-mapping/profiles/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting mapping profile:', error);
      throw error;
    }
  }
};

export default columnMappingApi; 