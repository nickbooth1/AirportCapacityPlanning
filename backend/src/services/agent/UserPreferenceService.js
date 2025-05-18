/**
 * UserPreferenceService.js
 * 
 * Service for managing user preferences for the AirportAI agent.
 * Stores and retrieves user-specific settings, customizations, and behavior patterns.
 * 
 * Part of AirportAI Agent Phase 4 implementation.
 */

const logger = require('../../utils/logger');
const UserPreference = require('../../models/agent/UserPreference');
const { v4: uuidv4 } = require('uuid');

/**
 * User Preference Service
 * 
 * Provides capabilities for:
 * - Managing user interface preferences
 * - Storing customization options
 * - Tracking feature usage preferences
 * - Supporting personalization across sessions
 * - Synchronizing preferences across devices
 */
class UserPreferenceService {
  constructor() {
    // Default preference templates
    this.defaultPreferences = {
      theme: 'system',
      notificationEnabled: true,
      defaultAirport: null,
      defaultTimeHorizon: 'week',
      autoRefreshInterval: 60,
      dataPresentation: 'chart',
      advancedMode: false
    };
    
    // Preference categories
    this.preferenceCategories = {
      APPEARANCE: 'appearance',
      NOTIFICATIONS: 'notifications',
      DATA: 'data',
      VISUALIZATION: 'visualization',
      ADVANCED: 'advanced'
    };
    
    logger.info('UserPreferenceService initialized');
  }
  
  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User preferences
   */
  async getUserPreferences(userId) {
    try {
      logger.debug(`Getting preferences for user ${userId}`);
      
      // Get user preferences from database
      const userPreference = await UserPreference.query().findById(userId);
      
      // Return preferences if found, otherwise return defaults
      if (userPreference) {
        return userPreference.preferences;
      } else {
        return this.defaultPreferences;
      }
    } catch (error) {
      logger.error(`Error getting user preferences: ${error.message}`);
      return this.defaultPreferences;
    }
  }
  
  /**
   * Get specific preference value
   * @param {string} userId - User ID
   * @param {string} key - Preference key
   * @param {*} defaultValue - Default value if preference not found
   * @returns {Promise<*>} - Preference value
   */
  async getPreference(userId, key, defaultValue = null) {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      // Return preference value if exists, otherwise return default
      return (preferences && preferences[key] !== undefined) 
        ? preferences[key] 
        : (defaultValue !== null ? defaultValue : this.defaultPreferences[key]);
    } catch (error) {
      logger.error(`Error getting preference ${key}: ${error.message}`);
      return defaultValue;
    }
  }
  
  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {Object} newPreferences - New preference values
   * @returns {Promise<Object>} - Updated preferences
   */
  async updatePreferences(userId, newPreferences) {
    try {
      logger.debug(`Updating preferences for user ${userId}`);
      
      // Validate preferences
      this.validatePreferences(newPreferences);
      
      // Get user preferences from database
      let userPreference = await UserPreference.query().findById(userId);
      
      if (userPreference) {
        // Update existing preferences
        await userPreference.updatePreferences(newPreferences);
        
        // Refresh the object with updated values
        userPreference = await UserPreference.query().findById(userId);
      } else {
        // Create new preferences
        userPreference = await UserPreference.query().insert({
          userId,
          preferences: {
            ...this.defaultPreferences,
            ...newPreferences
          }
        });
      }
      
      return userPreference.preferences;
    } catch (error) {
      logger.error(`Error updating user preferences: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update a specific preference
   * @param {string} userId - User ID
   * @param {string} key - Preference key
   * @param {*} value - New preference value
   * @returns {Promise<Object>} - Updated preferences
   */
  async updatePreference(userId, key, value) {
    return this.updatePreferences(userId, { [key]: value });
  }
  
  /**
   * Reset user preferences to defaults
   * @param {string} userId - User ID
   * @param {Array} [categories] - Optional specific categories to reset
   * @returns {Promise<Object>} - Updated preferences
   */
  async resetPreferences(userId, categories = null) {
    try {
      logger.debug(`Resetting preferences for user ${userId}`);
      
      // Get current preferences
      const currentPreferences = await this.getUserPreferences(userId);
      
      // If no categories specified, reset all preferences
      if (!categories) {
        return this.updatePreferences(userId, this.defaultPreferences);
      }
      
      // Reset only specified categories
      const updatedPreferences = { ...currentPreferences };
      
      // Map categories to preference keys
      for (const category of categories) {
        switch (category) {
          case this.preferenceCategories.APPEARANCE:
            updatedPreferences.theme = this.defaultPreferences.theme;
            break;
          case this.preferenceCategories.NOTIFICATIONS:
            updatedPreferences.notificationEnabled = this.defaultPreferences.notificationEnabled;
            break;
          case this.preferenceCategories.DATA:
            updatedPreferences.defaultAirport = this.defaultPreferences.defaultAirport;
            updatedPreferences.defaultTimeHorizon = this.defaultPreferences.defaultTimeHorizon;
            break;
          case this.preferenceCategories.VISUALIZATION:
            updatedPreferences.dataPresentation = this.defaultPreferences.dataPresentation;
            break;
          case this.preferenceCategories.ADVANCED:
            updatedPreferences.advancedMode = this.defaultPreferences.advancedMode;
            break;
        }
      }
      
      return this.updatePreferences(userId, updatedPreferences);
    } catch (error) {
      logger.error(`Error resetting preferences: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get user-specific dashboards
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - User dashboards
   */
  async getUserDashboards(userId) {
    try {
      logger.debug(`Getting dashboards for user ${userId}`);
      
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Return dashboards if defined, otherwise return empty array
      return preferences.dashboards || [];
    } catch (error) {
      logger.error(`Error getting user dashboards: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Create a user dashboard
   * @param {string} userId - User ID
   * @param {Object} dashboard - Dashboard configuration
   * @returns {Promise<Object>} - Created dashboard
   */
  async createDashboard(userId, dashboard) {
    try {
      logger.debug(`Creating dashboard for user ${userId}`);
      
      // Validate dashboard
      this.validateDashboard(dashboard);
      
      // Get current preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Initialize dashboards array if doesn't exist
      const dashboards = preferences.dashboards || [];
      
      // Create new dashboard
      const newDashboard = {
        id: dashboard.id || uuidv4(),
        name: dashboard.name,
        layout: dashboard.layout || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to dashboards array
      dashboards.push(newDashboard);
      
      // Update preferences
      await this.updatePreferences(userId, { dashboards });
      
      return newDashboard;
    } catch (error) {
      logger.error(`Error creating dashboard: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update a user dashboard
   * @param {string} userId - User ID
   * @param {string} dashboardId - Dashboard ID
   * @param {Object} updates - Dashboard updates
   * @returns {Promise<Object>} - Updated dashboard
   */
  async updateDashboard(userId, dashboardId, updates) {
    try {
      logger.debug(`Updating dashboard ${dashboardId} for user ${userId}`);
      
      // Get current preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Get dashboards array
      const dashboards = preferences.dashboards || [];
      
      // Find dashboard index
      const dashboardIndex = dashboards.findIndex(d => d.id === dashboardId);
      
      if (dashboardIndex === -1) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }
      
      // Update dashboard
      dashboards[dashboardIndex] = {
        ...dashboards[dashboardIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Update preferences
      await this.updatePreferences(userId, { dashboards });
      
      return dashboards[dashboardIndex];
    } catch (error) {
      logger.error(`Error updating dashboard: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a user dashboard
   * @param {string} userId - User ID
   * @param {string} dashboardId - Dashboard ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async deleteDashboard(userId, dashboardId) {
    try {
      logger.debug(`Deleting dashboard ${dashboardId} for user ${userId}`);
      
      // Get current preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Get dashboards array
      const dashboards = preferences.dashboards || [];
      
      // Filter out the dashboard to delete
      const updatedDashboards = dashboards.filter(d => d.id !== dashboardId);
      
      if (updatedDashboards.length === dashboards.length) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }
      
      // Update preferences
      await this.updatePreferences(userId, { dashboards: updatedDashboards });
      
      return true;
    } catch (error) {
      logger.error(`Error deleting dashboard: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get saved queries for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Saved queries
   */
  async getSavedQueries(userId) {
    try {
      logger.debug(`Getting saved queries for user ${userId}`);
      
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Return saved queries if defined, otherwise return empty array
      return preferences.savedQueries || [];
    } catch (error) {
      logger.error(`Error getting saved queries: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Save a query for a user
   * @param {string} userId - User ID
   * @param {Object} query - Query to save
   * @returns {Promise<Object>} - Saved query
   */
  async saveQuery(userId, query) {
    try {
      logger.debug(`Saving query for user ${userId}`);
      
      // Validate query
      if (!query.text) {
        throw new Error('Query text is required');
      }
      
      // Get current preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Initialize saved queries array if doesn't exist
      const savedQueries = preferences.savedQueries || [];
      
      // Create new saved query
      const savedQuery = {
        id: query.id || uuidv4(),
        text: query.text,
        description: query.description || '',
        category: query.category || 'general',
        createdAt: new Date().toISOString()
      };
      
      // Add to saved queries array
      savedQueries.push(savedQuery);
      
      // Update preferences
      await this.updatePreferences(userId, { savedQueries });
      
      return savedQuery;
    } catch (error) {
      logger.error(`Error saving query: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a saved query
   * @param {string} userId - User ID
   * @param {string} queryId - Query ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async deleteSavedQuery(userId, queryId) {
    try {
      logger.debug(`Deleting saved query ${queryId} for user ${userId}`);
      
      // Get current preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Get saved queries array
      const savedQueries = preferences.savedQueries || [];
      
      // Filter out the query to delete
      const updatedQueries = savedQueries.filter(q => q.id !== queryId);
      
      if (updatedQueries.length === savedQueries.length) {
        throw new Error(`Saved query ${queryId} not found`);
      }
      
      // Update preferences
      await this.updatePreferences(userId, { savedQueries: updatedQueries });
      
      return true;
    } catch (error) {
      logger.error(`Error deleting saved query: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Validate preference values
   * @param {Object} preferences - Preferences to validate
   * @throws {Error} If preferences are invalid
   * @private
   */
  validatePreferences(preferences) {
    // Validate theme
    if (preferences.theme && !['light', 'dark', 'system'].includes(preferences.theme)) {
      throw new Error('Invalid theme value');
    }
    
    // Validate notification enabled
    if (preferences.notificationEnabled !== undefined && 
        typeof preferences.notificationEnabled !== 'boolean') {
      throw new Error('notificationEnabled must be a boolean');
    }
    
    // Validate auto refresh interval
    if (preferences.autoRefreshInterval !== undefined) {
      const interval = parseInt(preferences.autoRefreshInterval, 10);
      if (isNaN(interval) || interval < 0) {
        throw new Error('autoRefreshInterval must be a positive number');
      }
    }
    
    // Validate data presentation
    if (preferences.dataPresentation && 
        !['table', 'chart', 'map'].includes(preferences.dataPresentation)) {
      throw new Error('Invalid dataPresentation value');
    }
    
    // Validate advanced mode
    if (preferences.advancedMode !== undefined && 
        typeof preferences.advancedMode !== 'boolean') {
      throw new Error('advancedMode must be a boolean');
    }
    
    // Validate dashboards
    if (preferences.dashboards !== undefined) {
      if (!Array.isArray(preferences.dashboards)) {
        throw new Error('dashboards must be an array');
      }
      
      preferences.dashboards.forEach(this.validateDashboard);
    }
    
    // Validate saved queries
    if (preferences.savedQueries !== undefined) {
      if (!Array.isArray(preferences.savedQueries)) {
        throw new Error('savedQueries must be an array');
      }
      
      preferences.savedQueries.forEach(query => {
        if (!query.id || !query.text) {
          throw new Error('Each saved query must have an id and text');
        }
      });
    }
  }
  
  /**
   * Validate dashboard configuration
   * @param {Object} dashboard - Dashboard to validate
   * @throws {Error} If dashboard is invalid
   * @private
   */
  validateDashboard(dashboard) {
    if (!dashboard) {
      throw new Error('Dashboard is required');
    }
    
    if (!dashboard.name) {
      throw new Error('Dashboard name is required');
    }
    
    if (dashboard.layout !== undefined && !Array.isArray(dashboard.layout)) {
      throw new Error('Dashboard layout must be an array');
    }
  }
  
  /**
   * Get global default preferences
   * @returns {Object} - Default preferences
   */
  getDefaultPreferences() {
    return { ...this.defaultPreferences };
  }
  
  /**
   * Synchronize preferences across devices
   * @param {string} userId - User ID
   * @param {string} deviceId - Device ID
   * @param {Object} devicePreferences - Device preferences
   * @returns {Promise<Object>} - Synchronized preferences
   */
  async syncPreferences(userId, deviceId, devicePreferences) {
    try {
      logger.debug(`Syncing preferences for user ${userId} from device ${deviceId}`);
      
      // Get current cloud preferences
      const cloudPreferences = await this.getUserPreferences(userId);
      
      // Merge preferences based on timestamps
      const mergedPreferences = this.mergePreferences(cloudPreferences, devicePreferences);
      
      // Update preferences
      await this.updatePreferences(userId, mergedPreferences);
      
      return mergedPreferences;
    } catch (error) {
      logger.error(`Error syncing preferences: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Merge preferences with timestamp-based conflict resolution
   * @param {Object} cloudPreferences - Cloud preferences
   * @param {Object} devicePreferences - Device preferences
   * @returns {Object} - Merged preferences
   * @private
   */
  mergePreferences(cloudPreferences, devicePreferences) {
    const merged = { ...cloudPreferences };
    
    // Get metadata for conflict resolution
    const cloudMeta = cloudPreferences._meta || { updatedAt: new Date(0).toISOString() };
    const deviceMeta = devicePreferences._meta || { updatedAt: new Date(0).toISOString() };
    
    // Compare timestamps for whole preferences object
    if (new Date(deviceMeta.updatedAt) > new Date(cloudMeta.updatedAt)) {
      // Device preferences are newer, use them as base
      merged = { ...devicePreferences };
    }
    
    // If there are individual property timestamps, use those for granular merging
    if (cloudMeta.propertyTimestamps && deviceMeta.propertyTimestamps) {
      for (const [key, timestamp] of Object.entries(deviceMeta.propertyTimestamps)) {
        const cloudTimestamp = cloudMeta.propertyTimestamps[key];
        
        if (!cloudTimestamp || new Date(timestamp) > new Date(cloudTimestamp)) {
          // Device property is newer, use it
          merged[key] = devicePreferences[key];
        }
      }
    }
    
    // Update metadata
    merged._meta = {
      updatedAt: new Date().toISOString(),
      propertyTimestamps: {
        ...(cloudMeta.propertyTimestamps || {}),
        ...(deviceMeta.propertyTimestamps || {})
      }
    };
    
    return merged;
  }
}

module.exports = new UserPreferenceService();