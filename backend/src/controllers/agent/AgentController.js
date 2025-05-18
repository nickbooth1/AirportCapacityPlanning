const agentService = require('../../services/agent/AgentService');
const logger = require('../../utils/logger');

/**
 * Controller for Agent API endpoints
 */
class AgentController {
  /**
   * Process a user query
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processQuery(req, res) {
    try {
      const { query, contextId } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required'
        });
      }
      
      const result = await agentService.processQuery(query, userId, contextId);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Query processing error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to process query: ${error.message}`
      });
    }
  }

  /**
   * Get conversation context
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getContext(req, res) {
    try {
      const { contextId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      if (!contextId) {
        return res.status(400).json({
          success: false,
          error: 'Context ID is required'
        });
      }
      
      const contextService = require('../../services/agent/ContextService');
      const context = await contextService.getContext(contextId);
      
      // Check if user has access to this context
      if (context.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this conversation context'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: context
      });
    } catch (error) {
      logger.error(`Context retrieval error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to retrieve context: ${error.message}`
      });
    }
  }

  /**
   * Get conversation history for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHistory(req, res) {
    try {
      const userId = req.user?.id || 'anonymous';
      const { offset, limit } = req.query;
      
      const offsetNum = parseInt(offset) || 0;
      const limitNum = parseInt(limit) || 10;
      
      const contextService = require('../../services/agent/ContextService');
      const contexts = await contextService.getUserContexts(userId, limitNum, offsetNum);
      
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
          limit: limitNum,
          offset: offsetNum
        }
      });
    } catch (error) {
      logger.error(`History retrieval error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to retrieve conversation history: ${error.message}`
      });
    }
  }

  /**
   * Process feedback for a response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processFeedback(req, res) {
    try {
      const { responseId, rating, comment } = req.body;
      
      if (!responseId) {
        return res.status(400).json({
          success: false,
          error: 'Response ID is required'
        });
      }
      
      if (rating === undefined || rating === null) {
        return res.status(400).json({
          success: false,
          error: 'Rating is required'
        });
      }
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5'
        });
      }
      
      const result = await agentService.processFeedback(responseId, rating, comment);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Feedback processing error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to process feedback: ${error.message}`
      });
    }
  }

  /**
   * Approve an action proposal
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async approveAction(req, res) {
    try {
      const { proposalId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      if (!proposalId) {
        return res.status(400).json({
          success: false,
          error: 'Proposal ID is required'
        });
      }
      
      const result = await agentService.processApproval(proposalId, userId);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Action approval error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to approve action: ${error.message}`
      });
    }
  }

  /**
   * Reject an action proposal
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async rejectAction(req, res) {
    try {
      const { proposalId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      if (!proposalId) {
        return res.status(400).json({
          success: false,
          error: 'Proposal ID is required'
        });
      }
      
      const result = await agentService.processRejection(proposalId, userId, reason);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Action rejection error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to reject action: ${error.message}`
      });
    }
  }

  /**
   * Get action proposal status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getActionStatus(req, res) {
    try {
      const { proposalId } = req.params;
      const userId = req.user?.id || 'anonymous';
      
      if (!proposalId) {
        return res.status(400).json({
          success: false,
          error: 'Proposal ID is required'
        });
      }
      
      const ActionProposal = require('../../models/agent/ActionProposal');
      const proposal = await ActionProposal.query().findById(proposalId);
      
      if (!proposal) {
        return res.status(404).json({
          success: false,
          error: 'Action proposal not found'
        });
      }
      
      // Check if user has access to this proposal
      if (proposal.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this action proposal'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: proposal
      });
    } catch (error) {
      logger.error(`Action status retrieval error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to retrieve action status: ${error.message}`
      });
    }
  }
}

module.exports = new AgentController(); 