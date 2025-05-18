const agentService = require('../../services/agent/AgentService');
const logger = require('../../utils/logger');

/**
 * Controller for Insights API endpoints
 */
class InsightsController {
  /**
   * Save an agent response as an insight
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async saveInsight(req, res) {
    try {
      const { responseId, title, category, notes } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      if (!responseId) {
        return res.status(400).json({
          success: false,
          error: 'Response ID is required'
        });
      }
      
      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required'
        });
      }
      
      // Validate category
      const validCategories = ['capacity', 'maintenance', 'infrastructure', 'other'];
      const validCategory = category && validCategories.includes(category.toLowerCase()) 
        ? category.toLowerCase() 
        : 'other';
      
      const insight = await agentService.saveInsight(
        responseId,
        userId,
        title,
        validCategory,
        notes
      );
      
      return res.status(200).json({
        success: true,
        data: insight
      });
    } catch (error) {
      logger.error(`Insight saving error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to save insight: ${error.message}`
      });
    }
  }

  /**
   * Get all insights for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getInsights(req, res) {
    try {
      const userId = req.user?.id || 'anonymous';
      const { category, offset, limit } = req.query;
      
      const offsetNum = parseInt(offset) || 0;
      const limitNum = parseInt(limit) || 10;
      
      const result = await agentService.getInsights(
        userId,
        category,
        limitNum,
        offsetNum
      );
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Insights retrieval error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to retrieve insights: ${error.message}`
      });
    }
  }

  /**
   * Get a specific insight by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getInsight(req, res) {
    try {
      const { insightId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      if (!insightId) {
        return res.status(400).json({
          success: false,
          error: 'Insight ID is required'
        });
      }
      
      const insight = await agentService.getInsight(insightId, userId);
      
      return res.status(200).json({
        success: true,
        data: insight
      });
    } catch (error) {
      logger.error(`Insight retrieval error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to retrieve insight: ${error.message}`
      });
    }
  }

  /**
   * Update an insight
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateInsight(req, res) {
    try {
      const { insightId } = req.params;
      const { title, category, notes } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      if (!insightId) {
        return res.status(400).json({
          success: false,
          error: 'Insight ID is required'
        });
      }
      
      // Get the insight
      const AgentInsight = require('../../models/agent/AgentInsight');
      const insight = await AgentInsight.query().findById(insightId);
      
      if (!insight) {
        return res.status(404).json({
          success: false,
          error: 'Insight not found'
        });
      }
      
      // Check if user has access to this insight
      if (insight.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this insight'
        });
      }
      
      // Validate category
      const validCategories = ['capacity', 'maintenance', 'infrastructure', 'other'];
      const validCategory = category && validCategories.includes(category.toLowerCase()) 
        ? category.toLowerCase() 
        : insight.category;
      
      // Update the insight
      await insight.updateMetadata(
        title || insight.title,
        validCategory,
        notes !== undefined ? notes : insight.notes,
        insight.tags
      );
      
      return res.status(200).json({
        success: true,
        data: insight
      });
    } catch (error) {
      logger.error(`Insight update error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to update insight: ${error.message}`
      });
    }
  }

  /**
   * Delete an insight
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteInsight(req, res) {
    try {
      const { insightId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      if (!insightId) {
        return res.status(400).json({
          success: false,
          error: 'Insight ID is required'
        });
      }
      
      // Get the insight
      const AgentInsight = require('../../models/agent/AgentInsight');
      const insight = await AgentInsight.query().findById(insightId);
      
      if (!insight) {
        return res.status(404).json({
          success: false,
          error: 'Insight not found'
        });
      }
      
      // Check if user has access to this insight
      if (insight.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this insight'
        });
      }
      
      // Delete the insight
      await AgentInsight.query().deleteById(insightId);
      
      return res.status(200).json({
        success: true,
        message: 'Insight deleted successfully'
      });
    } catch (error) {
      logger.error(`Insight deletion error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to delete insight: ${error.message}`
      });
    }
  }

  /**
   * Add a tag to an insight
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addTag(req, res) {
    try {
      const { insightId } = req.params;
      const { tag } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      if (!insightId) {
        return res.status(400).json({
          success: false,
          error: 'Insight ID is required'
        });
      }
      
      if (!tag) {
        return res.status(400).json({
          success: false,
          error: 'Tag is required'
        });
      }
      
      // Get the insight
      const AgentInsight = require('../../models/agent/AgentInsight');
      const insight = await AgentInsight.query().findById(insightId);
      
      if (!insight) {
        return res.status(404).json({
          success: false,
          error: 'Insight not found'
        });
      }
      
      // Check if user has access to this insight
      if (insight.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this insight'
        });
      }
      
      // Add tag
      await insight.addTag(tag);
      
      return res.status(200).json({
        success: true,
        data: insight
      });
    } catch (error) {
      logger.error(`Tag addition error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to add tag: ${error.message}`
      });
    }
  }

  /**
   * Remove a tag from an insight
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeTag(req, res) {
    try {
      const { insightId, tag } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      if (!insightId) {
        return res.status(400).json({
          success: false,
          error: 'Insight ID is required'
        });
      }
      
      if (!tag) {
        return res.status(400).json({
          success: false,
          error: 'Tag is required'
        });
      }
      
      // Get the insight
      const AgentInsight = require('../../models/agent/AgentInsight');
      const insight = await AgentInsight.query().findById(insightId);
      
      if (!insight) {
        return res.status(404).json({
          success: false,
          error: 'Insight not found'
        });
      }
      
      // Check if user has access to this insight
      if (insight.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this insight'
        });
      }
      
      // Remove tag
      await insight.removeTag(tag);
      
      return res.status(200).json({
        success: true,
        data: insight
      });
    } catch (error) {
      logger.error(`Tag removal error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to remove tag: ${error.message}`
      });
    }
  }
}

module.exports = new InsightsController(); 