/**
 * UserPreferenceController.js
 * 
 * Controller for handling user preference API endpoints.
 * 
 * Part of AirportAI Agent Phase 4 implementation.
 */

const UserPreferenceService = require('../../services/agent/UserPreferenceService');
const logger = require('../../utils/logger');

/**
 * Controller for user preference operations
 */
class UserPreferenceController {
  /**
   * Get user preferences
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserPreferences(req, res) {
    try {
      const userId = req.user.id;
      
      logger.debug(`Getting preferences for user ${userId}`);
      
      const preferences = await UserPreferenceService.getUserPreferences(userId);
      
      return res.json({ preferences });
    } catch (error) {
      logger.error(`Error getting user preferences: ${error.message}`);
      return res.status(500).json({ error: 'Failed to get user preferences' });
    }
  }
  
  /**
   * Update user preferences
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const preferences = req.body.preferences;
      
      if (!preferences) {
        return res.status(400).json({ error: 'Preferences are required' });
      }
      
      logger.debug(`Updating preferences for user ${userId}`);
      
      const updatedPreferences = await UserPreferenceService.updatePreferences(userId, preferences);
      
      return res.json({ 
        preferences: updatedPreferences,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      logger.error(`Error updating user preferences: ${error.message}`);
      return res.status(500).json({ error: `Failed to update user preferences: ${error.message}` });
    }
  }
  
  /**
   * Reset user preferences
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetPreferences(req, res) {
    try {
      const userId = req.user.id;
      const { categories } = req.body;
      
      logger.debug(`Resetting preferences for user ${userId}`);
      
      const updatedPreferences = await UserPreferenceService.resetPreferences(userId, categories);
      
      return res.json({
        preferences: updatedPreferences,
        message: 'Preferences reset successfully'
      });
    } catch (error) {
      logger.error(`Error resetting user preferences: ${error.message}`);
      return res.status(500).json({ error: 'Failed to reset user preferences' });
    }
  }
  
  /**
   * Get user dashboards
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserDashboards(req, res) {
    try {
      const userId = req.user.id;
      
      logger.debug(`Getting dashboards for user ${userId}`);
      
      const dashboards = await UserPreferenceService.getUserDashboards(userId);
      
      return res.json({ dashboards });
    } catch (error) {
      logger.error(`Error getting user dashboards: ${error.message}`);
      return res.status(500).json({ error: 'Failed to get user dashboards' });
    }
  }
  
  /**
   * Create user dashboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createDashboard(req, res) {
    try {
      const userId = req.user.id;
      const dashboard = req.body.dashboard;
      
      if (!dashboard || !dashboard.name) {
        return res.status(400).json({ error: 'Dashboard name is required' });
      }
      
      logger.debug(`Creating dashboard for user ${userId}`);
      
      const createdDashboard = await UserPreferenceService.createDashboard(userId, dashboard);
      
      return res.json({
        dashboard: createdDashboard,
        message: 'Dashboard created successfully'
      });
    } catch (error) {
      logger.error(`Error creating dashboard: ${error.message}`);
      return res.status(500).json({ error: `Failed to create dashboard: ${error.message}` });
    }
  }
  
  /**
   * Update user dashboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateDashboard(req, res) {
    try {
      const userId = req.user.id;
      const { dashboardId } = req.params;
      const updates = req.body.updates;
      
      if (!dashboardId) {
        return res.status(400).json({ error: 'Dashboard ID is required' });
      }
      
      if (!updates) {
        return res.status(400).json({ error: 'Dashboard updates are required' });
      }
      
      logger.debug(`Updating dashboard ${dashboardId} for user ${userId}`);
      
      const updatedDashboard = await UserPreferenceService.updateDashboard(userId, dashboardId, updates);
      
      return res.json({
        dashboard: updatedDashboard,
        message: 'Dashboard updated successfully'
      });
    } catch (error) {
      logger.error(`Error updating dashboard: ${error.message}`);
      return res.status(500).json({ error: `Failed to update dashboard: ${error.message}` });
    }
  }
  
  /**
   * Delete user dashboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteDashboard(req, res) {
    try {
      const userId = req.user.id;
      const { dashboardId } = req.params;
      
      if (!dashboardId) {
        return res.status(400).json({ error: 'Dashboard ID is required' });
      }
      
      logger.debug(`Deleting dashboard ${dashboardId} for user ${userId}`);
      
      const success = await UserPreferenceService.deleteDashboard(userId, dashboardId);
      
      if (!success) {
        return res.status(404).json({ error: 'Dashboard not found' });
      }
      
      return res.json({ message: 'Dashboard deleted successfully' });
    } catch (error) {
      logger.error(`Error deleting dashboard: ${error.message}`);
      return res.status(500).json({ error: `Failed to delete dashboard: ${error.message}` });
    }
  }
  
  /**
   * Get saved queries
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSavedQueries(req, res) {
    try {
      const userId = req.user.id;
      
      logger.debug(`Getting saved queries for user ${userId}`);
      
      const savedQueries = await UserPreferenceService.getSavedQueries(userId);
      
      return res.json({ savedQueries });
    } catch (error) {
      logger.error(`Error getting saved queries: ${error.message}`);
      return res.status(500).json({ error: 'Failed to get saved queries' });
    }
  }
  
  /**
   * Save query
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async saveQuery(req, res) {
    try {
      const userId = req.user.id;
      const query = req.body.query;
      
      if (!query || !query.text) {
        return res.status(400).json({ error: 'Query text is required' });
      }
      
      logger.debug(`Saving query for user ${userId}`);
      
      const savedQuery = await UserPreferenceService.saveQuery(userId, query);
      
      return res.json({
        query: savedQuery,
        message: 'Query saved successfully'
      });
    } catch (error) {
      logger.error(`Error saving query: ${error.message}`);
      return res.status(500).json({ error: `Failed to save query: ${error.message}` });
    }
  }
  
  /**
   * Delete saved query
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteSavedQuery(req, res) {
    try {
      const userId = req.user.id;
      const { queryId } = req.params;
      
      if (!queryId) {
        return res.status(400).json({ error: 'Query ID is required' });
      }
      
      logger.debug(`Deleting saved query ${queryId} for user ${userId}`);
      
      const success = await UserPreferenceService.deleteSavedQuery(userId, queryId);
      
      if (!success) {
        return res.status(404).json({ error: 'Saved query not found' });
      }
      
      return res.json({ message: 'Query deleted successfully' });
    } catch (error) {
      logger.error(`Error deleting saved query: ${error.message}`);
      return res.status(500).json({ error: `Failed to delete saved query: ${error.message}` });
    }
  }
  
  /**
   * Sync preferences from device
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async syncPreferences(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId, preferences } = req.body;
      
      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
      }
      
      if (!preferences) {
        return res.status(400).json({ error: 'Preferences are required' });
      }
      
      logger.debug(`Syncing preferences for user ${userId} from device ${deviceId}`);
      
      const syncedPreferences = await UserPreferenceService.syncPreferences(userId, deviceId, preferences);
      
      return res.json({
        preferences: syncedPreferences,
        message: 'Preferences synced successfully'
      });
    } catch (error) {
      logger.error(`Error syncing preferences: ${error.message}`);
      return res.status(500).json({ error: `Failed to sync preferences: ${error.message}` });
    }
  }
}

module.exports = new UserPreferenceController();