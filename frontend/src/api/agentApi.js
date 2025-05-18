import axios from 'axios';

// Base API client instance
const apiClient = axios.create({
  baseURL: '/api/agent',
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Agent API client service
 */
const agentApi = {
  /**
   * Submit a query to the agent
   * @param {string} query - The user's query
   * @param {string} contextId - Optional conversation context ID
   * @returns {Promise<Object>} - The agent's response
   */
  async submitQuery(query, contextId = null) {
    try {
      const response = await apiClient.post('/query', {
        query,
        contextId
      });
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Submit Query:', error);
      throw new Error(error.response?.data?.error || 'Failed to process query');
    }
  },

  /**
   * Get conversation history
   * @param {number} offset - Pagination offset
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Object>} - Conversation history data
   */
  async getHistory(offset = 0, limit = 10) {
    try {
      const response = await apiClient.get('/history', {
        params: {
          offset,
          limit
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Get History:', error);
      throw new Error(error.response?.data?.error || 'Failed to get conversation history');
    }
  },

  /**
   * Get a specific conversation context
   * @param {string} contextId - Conversation context ID
   * @returns {Promise<Object>} - Conversation context data
   */
  async getContext(contextId) {
    try {
      const response = await apiClient.get(`/context/${contextId}`);
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Get Context:', error);
      throw new Error(error.response?.data?.error || 'Failed to get conversation context');
    }
  },

  /**
   * Submit feedback for a response
   * @param {string} responseId - Response ID
   * @param {number} rating - Feedback rating (1-5)
   * @param {string} comment - Optional feedback comment
   * @returns {Promise<Object>} - Feedback submission result
   */
  async submitFeedback(responseId, rating, comment = null) {
    try {
      const response = await apiClient.post('/feedback', {
        responseId,
        rating,
        comment
      });
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Submit Feedback:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit feedback');
    }
  },

  /**
   * Approve an action proposal
   * @param {string} proposalId - Action proposal ID
   * @returns {Promise<Object>} - Approval result
   */
  async approveAction(proposalId) {
    try {
      const response = await apiClient.post(`/actions/approve/${proposalId}`);
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Approve Action:', error);
      throw new Error(error.response?.data?.error || 'Failed to approve action');
    }
  },

  /**
   * Reject an action proposal
   * @param {string} proposalId - Action proposal ID
   * @param {string} reason - Optional rejection reason
   * @returns {Promise<Object>} - Rejection result
   */
  async rejectAction(proposalId, reason = null) {
    try {
      const response = await apiClient.post(`/actions/reject/${proposalId}`, {
        reason
      });
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Reject Action:', error);
      throw new Error(error.response?.data?.error || 'Failed to reject action');
    }
  },

  /**
   * Get action proposal status
   * @param {string} proposalId - Action proposal ID
   * @returns {Promise<Object>} - Action proposal status
   */
  async getActionStatus(proposalId) {
    try {
      const response = await apiClient.get(`/actions/status/${proposalId}`);
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Get Action Status:', error);
      throw new Error(error.response?.data?.error || 'Failed to get action status');
    }
  },

  /**
   * Save an insight
   * @param {Object} data - Insight data (responseId, title, category, notes)
   * @returns {Promise<Object>} - Saved insight data
   */
  async saveInsight(data) {
    try {
      const response = await apiClient.post('/insights/save', data);
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Save Insight:', error);
      throw new Error(error.response?.data?.error || 'Failed to save insight');
    }
  },

  /**
   * Get insights
   * @param {string} category - Optional category filter
   * @param {number} offset - Pagination offset
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Object>} - Insights data
   */
  async getInsights(category = null, offset = 0, limit = 10) {
    try {
      const params = {
        offset,
        limit
      };
      
      if (category) {
        params.category = category;
      }
      
      const response = await apiClient.get('/insights', {
        params
      });
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Get Insights:', error);
      throw new Error(error.response?.data?.error || 'Failed to get insights');
    }
  },

  /**
   * Get a specific insight
   * @param {string} insightId - Insight ID
   * @returns {Promise<Object>} - Insight data
   */
  async getInsight(insightId) {
    try {
      const response = await apiClient.get(`/insights/${insightId}`);
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Get Insight:', error);
      throw new Error(error.response?.data?.error || 'Failed to get insight');
    }
  },

  /**
   * Generate a visualization
   * @param {Object} data - Visualization data
   * @returns {Promise<Object>} - Generated visualization
   */
  async generateVisualization(data) {
    try {
      const response = await apiClient.post('/visualizations/generate', data);
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Generate Visualization:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate visualization');
    }
  },

  /**
   * Get visualization templates
   * @returns {Promise<Object>} - Visualization templates
   */
  async getVisualizationTemplates() {
    try {
      const response = await apiClient.get('/visualizations/templates');
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Get Visualization Templates:', error);
      throw new Error(error.response?.data?.error || 'Failed to get visualization templates');
    }
  },

  /**
   * Export a visualization
   * @param {Object} data - Visualization data to export
   * @param {string} format - Export format (png, csv, json)
   * @returns {Promise<Object>} - Exported visualization data
   */
  async exportVisualization(data, format) {
    try {
      const response = await apiClient.post('/visualizations/export', {
        data,
        format
      });
      
      return response.data.data;
    } catch (error) {
      console.error('API Error - Export Visualization:', error);
      throw new Error(error.response?.data?.error || 'Failed to export visualization');
    }
  }
};

export default agentApi; 