const agentService = require('../../services/agent/AgentService');
const contextService = require('../../services/agent/ContextService');
const logger = require('../../utils/logger');

// Ensure we're working with an instance, not trying to use as a constructor
if (typeof contextService === 'function') {
  throw new Error('ContextService imported as constructor but exported as instance');
}
const { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError, 
  UnauthorizedError 
} = require('../../middleware/errorHandler');

/**
 * Controller for Agent API endpoints
 */
class AgentController {
  /**
   * Process a user query
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processQuery(req, res, next) {
    try {
      const { query, contextId } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      // Input validation is now handled by middleware
      
      const result = await agentService.processQuery(query, userId, contextId);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Query processing error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Create a new conversation context
   * @param {Object} req - Express request object 
   * @param {Object} res - Express response object
   */
  async createContext(req, res, next) {
    try {
      const userId = req.user?.id || 'anonymous';
      
      // Create a new context
      const context = await contextService.createContext(userId);
      
      return res.status(201).json({
        success: true,
        data: {
          contextId: context.id,
          created: true
        }
      });
    } catch (error) {
      logger.error(`Context creation error: ${error.message}`);
      next(error);
    }
  }
  
  /**
   * Get conversation context
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getContext(req, res, next) {
    try {
      const { contextId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      // UUID validation is now handled by middleware
      
      try {
        const context = await contextService.getContext(contextId);
        
        // Check if user has access to this context
        if (context.userId !== userId) {
          throw new ForbiddenError('You do not have access to this conversation context');
        }
        
        return res.status(200).json({
          success: true,
          data: context
        });
      } catch (error) {
        // Handle context not found
        if (error.message.includes('not found')) {
          throw new NotFoundError(`Conversation context not found: ${contextId}`);
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Context retrieval error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get conversation history for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHistory(req, res, next) {
    try {
      const userId = req.user?.id || 'anonymous';
      
      // Pagination validation is now handled by middleware
      const { limit, offset } = req.pagination || { limit: 10, offset: 0 };
      
      const contexts = await contextService.getUserContexts(userId, limit, offset);
      
      // Format the contexts for the response
      const formattedContexts = contexts.map(context => ({
        contextId: context.id,
        startTime: context.startTime,
        lastUpdateTime: context.lastUpdateTime,
        messageCount: context.messages.length,
        preview: context.messages.length > 0 
          ? context.messages[0].content.substring(0, 50) + (context.messages[0].content.length > 50 ? '...' : '')
          : 'Empty conversation'
      }));
      
      return res.status(200).json({
        success: true,
        data: {
          conversations: formattedContexts,
          total: formattedContexts.length,
          limit,
          offset
        }
      });
    } catch (error) {
      logger.error(`History retrieval error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Process feedback for a response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processFeedback(req, res, next) {
    try {
      const { responseId, rating, comment } = req.body;
      
      // Validation is now handled by middleware
      
      const result = await agentService.processFeedback(responseId, rating, comment);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Feedback processing error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Approve an action proposal
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async approveAction(req, res, next) {
    try {
      const { proposalId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      // Validation is now handled by middleware
      
      try {
        const result = await agentService.processApproval(proposalId, userId);
        
        return res.status(200).json({
          success: true,
          data: result
        });
      } catch (error) {
        // Handle specific errors
        if (error.message.includes('not found')) {
          throw new NotFoundError(`Action proposal not found: ${proposalId}`);
        }
        if (error.message.includes('not authorized')) {
          throw new ForbiddenError(`User ${userId} is not authorized to approve this action`);
        }
        if (error.message.includes('expired')) {
          throw new ValidationError('Action proposal has expired');
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Action approval error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Reject an action proposal
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async rejectAction(req, res, next) {
    try {
      const { proposalId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      // Validation is now handled by middleware
      
      try {
        const result = await agentService.processRejection(proposalId, userId, reason);
        
        return res.status(200).json({
          success: true,
          data: result
        });
      } catch (error) {
        // Handle specific errors
        if (error.message.includes('not found')) {
          throw new NotFoundError(`Action proposal not found: ${proposalId}`);
        }
        if (error.message.includes('not authorized')) {
          throw new ForbiddenError(`User ${userId} is not authorized to reject this action`);
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Action rejection error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get action proposal status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getActionStatus(req, res, next) {
    try {
      const { proposalId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      // Validation is now handled by middleware
      
      const ActionProposal = require('../../models/agent/ActionProposal');
      const proposal = await ActionProposal.query().findById(proposalId);
      
      if (!proposal) {
        throw new NotFoundError(`Action proposal not found: ${proposalId}`);
      }
      
      // Check if user has access to this proposal
      if (proposal.userId !== userId) {
        throw new ForbiddenError('You do not have access to this action proposal');
      }
      
      return res.status(200).json({
        success: true,
        data: proposal
      });
    } catch (error) {
      logger.error(`Action status retrieval error: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new AgentController(); 