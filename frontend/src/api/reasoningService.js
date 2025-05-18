import { getApiUrl, handleApiResponse } from '../lib/api';

/**
 * Fetch reasoning data for a specific reasoning ID
 * @param {string} reasoningId - The ID of the reasoning process to fetch
 * @returns {Promise<Object>} - The reasoning data
 */
export const fetchReasoningData = async (reasoningId) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${getApiUrl()}/api/agent/reasoning/${reasoningId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching reasoning data:', error);
    throw new Error('Failed to fetch reasoning data.');
  }
};

/**
 * Fetch reasoning history for a specific context
 * @param {string} contextId - The conversation context ID
 * @returns {Promise<Array>} - The reasoning history
 */
export const fetchReasoningHistory = async (contextId) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${getApiUrl()}/api/agent/reasoning/history/${contextId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching reasoning history:', error);
    throw new Error('Failed to fetch reasoning history.');
  }
};

/**
 * Initiate a complex reasoning process for a query
 * @param {string} query - The complex query to reason about
 * @param {string} contextId - Optional conversation context ID
 * @returns {Promise<Object>} - The reasoning process information
 */
export const initiateReasoning = async (query, contextId = null) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${getApiUrl()}/api/agent/reasoning/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query,
        contextId
      })
    });
    
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error initiating reasoning process:', error);
    throw new Error('Failed to initiate reasoning process.');
  }
};

/**
 * Get the explanation for a specific reasoning step
 * @param {string} reasoningId - The ID of the reasoning process
 * @param {string} stepId - The ID of the step to explain
 * @returns {Promise<Object>} - The step explanation
 */
export const getStepExplanation = async (reasoningId, stepId) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${getApiUrl()}/api/agent/reasoning/${reasoningId}/step/${stepId}/explain`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching step explanation:', error);
    throw new Error('Failed to fetch step explanation.');
  }
};

/**
 * Get insights generated from a reasoning process
 * @param {string} reasoningId - The ID of the reasoning process
 * @returns {Promise<Array>} - The insights
 */
export const getReasoningInsights = async (reasoningId) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${getApiUrl()}/api/agent/reasoning/${reasoningId}/insights`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching reasoning insights:', error);
    throw new Error('Failed to fetch reasoning insights.');
  }
};

/**
 * Save a feedback about a reasoning process
 * @param {string} reasoningId - The ID of the reasoning process
 * @param {Object} feedback - The feedback data
 * @returns {Promise<Object>} - The saved feedback
 */
export const saveReasoningFeedback = async (reasoningId, feedback) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${getApiUrl()}/api/agent/reasoning/${reasoningId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(feedback)
    });
    
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error saving reasoning feedback:', error);
    throw new Error('Failed to save reasoning feedback.');
  }
};