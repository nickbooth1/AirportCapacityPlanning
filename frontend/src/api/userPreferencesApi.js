/**
 * User Preferences API
 * 
 * Client-side API functions for managing user preferences
 * 
 * Part of AirportAI Agent Phase 4 implementation.
 */

import axios from 'axios';

const BASE_URL = '/api/preferences';

/**
 * Get user preferences
 * @returns {Promise<Object>} - User preferences
 */
export const getUserPreferences = async () => {
  try {
    const response = await axios.get(BASE_URL);
    return response.data.preferences;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    throw error;
  }
};

/**
 * Update user preferences
 * @param {Object} preferences - Updated preferences
 * @returns {Promise<Object>} - Updated preferences
 */
export const updatePreferences = async (preferences) => {
  try {
    const response = await axios.put(BASE_URL, { preferences });
    return response.data.preferences;
  } catch (error) {
    console.error('Error updating preferences:', error);
    throw error;
  }
};

/**
 * Reset user preferences
 * @param {Array} [categories] - Optional categories to reset
 * @returns {Promise<Object>} - Reset preferences
 */
export const resetPreferences = async (categories = null) => {
  try {
    const response = await axios.post(`${BASE_URL}/reset`, { categories });
    return response.data.preferences;
  } catch (error) {
    console.error('Error resetting preferences:', error);
    throw error;
  }
};

/**
 * Get user dashboards
 * @returns {Promise<Array>} - User dashboards
 */
export const getUserDashboards = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/dashboards`);
    return response.data.dashboards;
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    throw error;
  }
};

/**
 * Create a dashboard
 * @param {Object} dashboard - Dashboard to create
 * @returns {Promise<Object>} - Created dashboard
 */
export const createDashboard = async (dashboard) => {
  try {
    const response = await axios.post(`${BASE_URL}/dashboards`, { dashboard });
    return response.data.dashboard;
  } catch (error) {
    console.error('Error creating dashboard:', error);
    throw error;
  }
};

/**
 * Update a dashboard
 * @param {string} dashboardId - Dashboard ID
 * @param {Object} updates - Dashboard updates
 * @returns {Promise<Object>} - Updated dashboard
 */
export const updateDashboard = async (dashboardId, updates) => {
  try {
    const response = await axios.put(`${BASE_URL}/dashboards/${dashboardId}`, { updates });
    return response.data.dashboard;
  } catch (error) {
    console.error('Error updating dashboard:', error);
    throw error;
  }
};

/**
 * Delete a dashboard
 * @param {string} dashboardId - Dashboard ID
 * @returns {Promise<Object>} - Delete result
 */
export const deleteDashboard = async (dashboardId) => {
  try {
    const response = await axios.delete(`${BASE_URL}/dashboards/${dashboardId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    throw error;
  }
};

/**
 * Get saved queries
 * @returns {Promise<Array>} - Saved queries
 */
export const getSavedQueries = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/saved-queries`);
    return response.data.savedQueries;
  } catch (error) {
    console.error('Error fetching saved queries:', error);
    throw error;
  }
};

/**
 * Save a query
 * @param {Object} query - Query to save
 * @returns {Promise<Object>} - Saved query
 */
export const saveQuery = async (query) => {
  try {
    const response = await axios.post(`${BASE_URL}/saved-queries`, { query });
    return response.data.query;
  } catch (error) {
    console.error('Error saving query:', error);
    throw error;
  }
};

/**
 * Delete a saved query
 * @param {string} queryId - Query ID
 * @returns {Promise<Object>} - Delete result
 */
export const deleteSavedQuery = async (queryId) => {
  try {
    const response = await axios.delete(`${BASE_URL}/saved-queries/${queryId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting saved query:', error);
    throw error;
  }
};

/**
 * Sync preferences from device
 * @param {string} deviceId - Device ID
 * @param {Object} preferences - Device preferences
 * @returns {Promise<Object>} - Synced preferences
 */
export const syncPreferences = async (deviceId, preferences) => {
  try {
    const response = await axios.post(`${BASE_URL}/sync`, { deviceId, preferences });
    return response.data.preferences;
  } catch (error) {
    console.error('Error syncing preferences:', error);
    throw error;
  }
};

export default {
  getUserPreferences,
  updatePreferences,
  resetPreferences,
  getUserDashboards,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  getSavedQueries,
  saveQuery,
  deleteSavedQuery,
  syncPreferences
};