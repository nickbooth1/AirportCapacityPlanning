/**
 * FeedbackController.js
 * 
 * Controller for managing feedback and continuous learning features.
 * 
 * Part of AirportAI Agent Phase 3 implementation.
 */

const logger = require('../utils/logger');
const { ContinuousLearningService } = require('../services/agent');

/**
 * Controller for managing feedback and continuous learning
 */
class FeedbackController {
  constructor() {
    // Initialize services
    this.continuousLearningService = new ContinuousLearningService();
    
    logger.info('FeedbackController initialized');
  }
  
  /**
   * Submit feedback on agent performance
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async submitFeedback(req, res) {
    try {
      logger.debug('Submitting feedback');
      
      // Prepare feedback data
      const feedbackData = {
        ...req.body,
        userId: req.user.id
      };
      
      // Validate required fields
      if (!feedbackData.targetType || !feedbackData.targetId || !feedbackData.rating) {
        return res.status(400).json({ error: 'targetType, targetId, and rating are required' });
      }
      
      // Submit feedback
      const feedback = await this.continuousLearningService.submitFeedback(feedbackData);
      
      return res.status(201).json(feedback);
    } catch (error) {
      logger.error(`Error submitting feedback: ${error.message}`);
      
      if (error.message.includes('Invalid feedback')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }
  }
  
  /**
   * Record implicit feedback from user interaction
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recordImplicitFeedback(req, res) {
    try {
      logger.debug('Recording implicit feedback');
      
      // Prepare interaction data
      const interactionData = {
        ...req.body,
        userId: req.user.id
      };
      
      // Validate required fields
      if (!interactionData.targetType || !interactionData.targetId || !interactionData.type) {
        return res.status(400).json({ error: 'targetType, targetId, and type are required' });
      }
      
      // Record interaction
      await this.continuousLearningService.recordImplicitFeedback(interactionData);
      
      return res.json({ success: true });
    } catch (error) {
      logger.error(`Error recording implicit feedback: ${error.message}`);
      return res.status(500).json({ error: 'Failed to record implicit feedback' });
    }
  }
  
  /**
   * Get performance metrics for the agent
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPerformanceMetrics(req, res) {
    try {
      logger.debug('Getting performance metrics');
      
      // Prepare options
      const options = {
        timeRange: req.query.timeRange || 'weekly',
        category: req.query.category
      };
      
      // Get metrics
      const metrics = await this.continuousLearningService.getPerformanceMetrics(options);
      
      return res.json(metrics);
    } catch (error) {
      logger.error(`Error getting performance metrics: ${error.message}`);
      return res.status(500).json({ error: 'Failed to retrieve performance metrics' });
    }
  }
  
  /**
   * Create an A/B testing experiment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createExperiment(req, res) {
    try {
      logger.debug('Creating experiment');
      
      // Prepare experiment data
      const experimentData = req.body;
      
      // Validate required fields
      if (!experimentData.name || !experimentData.targetType || !experimentData.variants) {
        return res.status(400).json({ error: 'name, targetType, and variants are required' });
      }
      
      // Create experiment
      const experiment = await this.continuousLearningService.createExperiment(experimentData);
      
      return res.status(201).json(experiment);
    } catch (error) {
      logger.error(`Error creating experiment: ${error.message}`);
      return res.status(500).json({ error: 'Failed to create experiment' });
    }
  }
  
  /**
   * Get variant for an active experiment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getExperimentVariant(req, res) {
    try {
      const experimentId = req.params.experimentId;
      
      logger.debug(`Getting variant for experiment ${experimentId}`);
      
      // Get variant
      const variant = this.continuousLearningService.getExperimentVariant(experimentId, req.user.id);
      
      return res.json(variant);
    } catch (error) {
      logger.error(`Error getting experiment variant: ${error.message}`);
      
      if (error.message.includes('No active experiment')) {
        return res.status(404).json({ error: 'No active experiment found' });
      }
      
      return res.status(500).json({ error: 'Failed to get experiment variant' });
    }
  }
  
  /**
   * Record experiment interaction
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recordExperimentInteraction(req, res) {
    try {
      const experimentId = req.params.experimentId;
      const variantId = req.params.variantId;
      
      logger.debug(`Recording interaction for experiment ${experimentId}, variant ${variantId}`);
      
      // Prepare interaction data
      const interactionData = {
        ...req.body,
        userId: req.user.id
      };
      
      // Record interaction
      await this.continuousLearningService.recordExperimentInteraction(experimentId, variantId, interactionData);
      
      return res.json({ success: true });
    } catch (error) {
      logger.error(`Error recording experiment interaction: ${error.message}`);
      
      if (error.message.includes('Experiment not found')) {
        return res.status(404).json({ error: 'Experiment not found' });
      }
      
      if (error.message.includes('Variant not found')) {
        return res.status(404).json({ error: 'Variant not found' });
      }
      
      return res.status(500).json({ error: 'Failed to record experiment interaction' });
    }
  }
}

module.exports = new FeedbackController();