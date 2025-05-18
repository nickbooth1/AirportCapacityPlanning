import agentApi from './agentApi';

/**
 * Agent Service wrapper
 * Provides a simplified interface to the agent API
 */
export const AgentService = {
  /**
   * Send a query to the agent
   * @param {string} contextId - Conversation context ID
   * @param {string} query - The query text
   * @returns {Promise<Object>} - The agent's response
   */
  async sendQuery(contextId, query) {
    return agentApi.submitQuery(query, contextId);
  },

  /**
   * Get a list of conversations
   * @param {number} limit - Maximum number of conversations to retrieve
   * @returns {Promise<Array>} - List of conversations
   */
  async getConversations(limit = 10) {
    const result = await agentApi.getHistory(0, limit);
    return result.conversations || [];
  },

  /**
   * Get conversation details
   * @param {string} id - Conversation ID
   * @returns {Promise<Object>} - Conversation details
   */
  async getConversation(id) {
    return agentApi.getContext(id);
  },

  /**
   * Create a new conversation
   * @returns {Promise<Object>} - New conversation object
   */
  async createConversation() {
    // Using a simulated response for now
    // In a real implementation, this would call the API
    return {
      id: 'new-' + Date.now(),
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      messages: []
    };
  },

  /**
   * Approve an action
   * @param {string} proposalId - Action proposal ID
   * @returns {Promise<Object>} - Result of the approval
   */
  async approveAction(proposalId) {
    return agentApi.approveAction(proposalId);
  },

  /**
   * Reject an action
   * @param {string} proposalId - Action proposal ID
   * @param {string} reason - Optional rejection reason
   * @returns {Promise<Object>} - Result of the rejection
   */
  async rejectAction(proposalId, reason) {
    return agentApi.rejectAction(proposalId, reason);
  },

  /**
   * Save an insight
   * @param {Object} data - Insight data
   * @returns {Promise<Object>} - Saved insight
   */
  async saveInsight(data) {
    return agentApi.saveInsight(data);
  },

  /**
   * Get insights
   * @param {string} category - Optional category filter
   * @param {number} limit - Maximum number of insights to retrieve
   * @returns {Promise<Array>} - List of insights
   */
  async getInsights(category = null, limit = 10) {
    const result = await agentApi.getInsights(category, 0, limit);
    return result.insights || [];
  },

  /**
   * Get insight details
   * @param {string} id - Insight ID
   * @returns {Promise<Object>} - Insight details
   */
  async getInsight(id) {
    return agentApi.getInsight(id);
  },

  /**
   * Submit feedback for a response
   * @param {string} responseId - Response ID
   * @param {number} rating - Rating (1-5)
   * @param {string} comment - Optional comment
   * @returns {Promise<Object>} - Feedback result
   */
  async submitFeedback(responseId, rating, comment = null) {
    return agentApi.submitFeedback(responseId, rating, comment);
  }
};

export default AgentService; 