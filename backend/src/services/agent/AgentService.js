const AgentQuery = require('../../models/agent/AgentQuery');
const AgentResponse = require('../../models/agent/AgentResponse');
const ActionProposal = require('../../models/agent/ActionProposal');
const AgentInsight = require('../../models/agent/AgentInsight');
const Feedback = require('../../models/agent/Feedback');
const openaiService = require('./OpenAIService');
const nlpService = require('./NLPService');
const contextService = require('./ContextService');
const toolOrchestratorService = require('./ToolOrchestratorService');
const visualizationService = require('./VisualizationService');
const responseGeneratorService = require('./ResponseGeneratorService');
const feedbackLearningService = require('./initFeedbackLearning');
const continuousLearningService = require('./ContinuousLearningService');
const longTermMemoryService = require('./LongTermMemoryService');
const { getWebSocketService } = require('./WebSocketService');
const logger = require('../../utils/logger');

/**
 * Main service for the AI Agent
 */
class AgentService {
  /**
   * Process a user query
   * @param {string} query - The user's query text
   * @param {string} userId - The user ID
   * @param {string} contextId - Optional conversation context ID
   * @returns {Promise<Object>} - Processing result with response
   */
  async processQuery(query, userId, contextId = null) {
    try {
      logger.info(`Processing query for user ${userId}: ${query}`);
      
      // Get or create conversation context
      let context;
      if (contextId) {
        try {
          context = await contextService.getContext(contextId);
        } catch (error) {
          logger.warn(`Context not found, creating new: ${error.message}`);
          context = await contextService.createContext(userId);
        }
      } else {
        context = await contextService.createContext(userId);
      }
      
      // Add user message to context
      await contextService.addUserMessage(context.id, query);
      
      // Create query record
      const agentQuery = await AgentQuery.query().insert({
        text: query,
        contextId: context.id
      });
      
      await agentQuery.startProcessing();
      
      // Process query with NLP
      const nlpResult = await nlpService.processQuery(query);
      const { intent, confidence, entities } = nlpResult;
      
      // Update query record with NLP results
      await agentQuery.completeProcessing(intent, confidence, entities);
      
      // Update context with intent and entities
      await contextService.addIntent(context.id, intent, confidence);
      await contextService.updateEntities(context.id, entities);
      
      // Get WebSocket service for real-time updates
      const wsService = getWebSocketService();
      
      // Send typing indicator if WebSocket is available
      if (wsService) {
        wsService.broadcastTypingIndicator(context.id, true);
      }
      
      // Execute appropriate tool based on intent and entities
      const toolResult = await toolOrchestratorService.executeTool(intent, entities);
      
      // If tool execution requires approval, create action proposal
      if (toolResult.requiresApproval) {
        const actionProposal = await ActionProposal.query().insert({
          contextId: context.id,
          userId: userId,
          actionType: toolResult.actionType,
          description: toolResult.description,
          parameters: toolResult.parameters
        });
        
        // Generate response for action proposal using templates
        const responseText = await responseGeneratorService.generateSystemResponse(
          'action_approval_request',
          { action_description: toolResult.description }
        );
        
        // Create response record
        const agentResponse = await AgentResponse.query().insert({
          queryId: agentQuery.id,
          contextId: context.id,
          text: responseText
        });
        
        // Add agent message to context
        await contextService.addAgentMessage(context.id, responseText, agentResponse.id);
        
        // Broadcast action proposal if WebSocket is available
        if (wsService) {
          wsService.broadcastActionProposal(userId, {
            id: actionProposal.id,
            description: toolResult.description,
            actionType: toolResult.actionType,
            parameters: toolResult.parameters
          });
          
          // Turn off typing indicator
          wsService.broadcastTypingIndicator(context.id, false);
          
          // Broadcast agent response
          wsService.broadcastAgentResponse(context.id, {
            id: agentResponse.id,
            text: responseText,
            visualizations: []
          });
        }
        
        return {
          response: {
            id: agentResponse.id,
            text: responseText,
            visualizations: []
          },
          contextId: context.id,
          requiresApproval: true,
          proposalId: actionProposal.id,
          actionType: toolResult.actionType
        };
      }
      
      // For regular queries (not requiring approval), generate response
      let responseText;
      let visualizations = [];
      
      if (toolResult.success) {
        // Generate visualization if appropriate
        if (toolResult.data) {
          try {
            const vizType = visualizationService.recommendVisualizationType(
              toolResult.data,
              intent
            );
            
            if (vizType === 'barChart' && toolResult.data.labels && toolResult.data.datasets) {
              const title = `${entities.terminal || 'Terminal'} ${entities.aircraft_type || 'Aircraft'} Capacity`;
              const chartViz = await visualizationService.generateBarChart(
                toolResult.data,
                title,
                {
                  xAxisLabel: toolResult.data.xAxisLabel || 'Category',
                  yAxisLabel: toolResult.data.yAxisLabel || 'Value'
                }
              );
              visualizations.push(chartViz);
            }
            else if (vizType === 'lineChart' && toolResult.data.labels && toolResult.data.datasets) {
              const title = `${entities.terminal || 'Terminal'} ${entities.aircraft_type || 'Aircraft'} Capacity Over Time`;
              const chartViz = await visualizationService.generateLineChart(
                toolResult.data,
                title,
                {
                  xAxisLabel: toolResult.data.xAxisLabel || 'Time',
                  yAxisLabel: toolResult.data.yAxisLabel || 'Value'
                }
              );
              visualizations.push(chartViz);
            }
            else if (vizType === 'pieChart' && toolResult.data.labels && toolResult.data.values) {
              const title = `${entities.terminal || 'Terminal'} ${entities.aircraft_type || 'Aircraft'} Distribution`;
              const chartViz = await visualizationService.generatePieChart(
                toolResult.data,
                title
              );
              visualizations.push(chartViz);
            }
            
            // Add table visualization if data has rows
            if (toolResult.data.headers && toolResult.data.rows) {
              const tableViz = visualizationService.formatTable(
                toolResult.data.headers,
                toolResult.data.rows,
                `${entities.terminal || 'Terminal'} ${entities.aircraft_type || 'Aircraft'} Data`
              );
              visualizations.push(tableViz);
            }
          } catch (error) {
            logger.error(`Visualization generation error: ${error.message}`);
            // Continue without visualizations if there's an error
          }
        }
        
        // Generate response text using ResponseGeneratorService
        try {
          const responseResult = await responseGeneratorService.generateResponse({
            query,
            intent,
            entities,
            data: toolResult.data,
            options: {
              useLLM: true,
              includeSuggestions: true,
              tone: 'professional',
              detail: 'medium',
              format: 'text'
            }
          });
          responseText = responseResult.text;
          
          // Add suggested actions to visualizations if available
          if (responseResult.suggestedActions && responseResult.suggestedActions.length > 0) {
            // Create a suggestions visualization
            const suggestionsViz = {
              type: 'suggestions',
              format: 'json',
              data: responseResult.suggestedActions,
              title: 'Suggested Follow-ups',
              metadata: { source: 'response_generator' }
            };
            visualizations.push(suggestionsViz);
          }
        } catch (error) {
          logger.error(`Response generation error: ${error.message}`);
          responseText = `I found information related to your query about ${entities.terminal || ''} ${entities.aircraft_type || ''} ${entities.time_period || ''}, but I encountered an error generating a natural language response.`;
        }
      } else {
        // Handle tool execution failure
        responseText = `I'm sorry, I couldn't find the information you're looking for. ${toolResult.error || 'Please try a different query.'}`;
      }
      
      // Create response record
      const agentResponse = await AgentResponse.query().insert({
        queryId: agentQuery.id,
        contextId: context.id,
        text: responseText
      });
      
      // Add visualizations to response
      for (const viz of visualizations) {
        await agentResponse.addVisualization(
          viz.type,
          viz.format,
          viz.data,
          viz.title,
          viz.metadata
        );
      }
      
      // Add agent message to context
      await contextService.addAgentMessage(context.id, responseText, agentResponse.id);
      
      // If tool execution succeeded, save the raw data
      if (toolResult.success && toolResult.data) {
        await agentResponse.setRawData(toolResult.data);
      }
      
      // Retrieve updated response with visualizations
      const updatedResponse = await AgentResponse.query().findById(agentResponse.id);
      
      // Apply feedback-based learning enhancements if available
      let enhancedResponse = {
        id: updatedResponse.id,
        text: updatedResponse.text,
        visualizations: updatedResponse.visualizations || []
      };
      
      // Use feedback learning to personalize the response if available
      if (feedbackLearningService) {
        try {
          enhancedResponse = await feedbackLearningService.enhanceResponseWithLearning(
            enhancedResponse,
            context.userId,
            {
              query: query.text,
              intent: query.parsedIntent,
              entities: query.entities || {},
              toolResult: toolResult.success ? toolResult.data : null
            }
          );
          
          // Only update the response text in database if it was changed
          if (enhancedResponse.text !== updatedResponse.text) {
            await updatedResponse.$query().patch({ 
              text: enhancedResponse.text,
              metadata: { ...updatedResponse.metadata, personalized: true }
            });
          }
        } catch (enhanceError) {
          logger.warn(`Response enhancement error: ${enhanceError.message}`);
          // Continue with unenhanced response on error
        }
      }
      
      // Broadcast agent response if WebSocket is available
      if (wsService) {
        // Turn off typing indicator
        wsService.broadcastTypingIndicator(context.id, false);
        
        // Broadcast the response
        wsService.broadcastAgentResponse(context.id, enhancedResponse);
      }
      
      return {
        response: enhancedResponse,
        contextId: context.id,
        requiresApproval: false
      };
    } catch (error) {
      logger.error(`Query processing error: ${error.message}`);
      
      // Get WebSocket service for error notification
      const wsService = getWebSocketService();
      if (wsService && contextId) {
        // Turn off typing indicator
        wsService.broadcastTypingIndicator(contextId, false);
        
        // Broadcast error
        wsService.broadcastError(userId, `Failed to process query: ${error.message}`);
      }
      
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }

  /**
   * Process an action approval
   * @param {string} proposalId - The action proposal ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - Processing result
   */
  async processApproval(proposalId, userId) {
    try {
      logger.info(`Processing approval for proposal ${proposalId} by user ${userId}`);
      
      // Get the action proposal
      const proposal = await ActionProposal.query().findById(proposalId);
      
      if (!proposal) {
        throw new Error(`Action proposal not found: ${proposalId}`);
      }
      
      // Verify user
      if (proposal.userId !== userId) {
        throw new Error(`User ${userId} is not authorized to approve this action`);
      }
      
      // Check if proposal is still pending
      if (proposal.status !== 'pending') {
        throw new Error(`Action proposal is not pending: ${proposal.status}`);
      }
      
      // Check if proposal is expired
      if (proposal.isExpired()) {
        await proposal.$query().patch({ status: 'expired' });
        throw new Error(`Action proposal has expired`);
      }
      
      // Approve the proposal
      await proposal.approve();
      
      // Get WebSocket service for updates
      const wsService = getWebSocketService();
      
      // Show "executing" status if WebSocket is available
      if (wsService) {
        wsService.broadcastTypingIndicator(proposal.contextId, true);
      }
      
      // Execute the approved action
      const actionResult = await toolOrchestratorService.executeApprovedAction(
        proposal.actionType.split('_')[0] + 'Service', // e.g. maintenance_create -> maintenanceService
        proposal.actionType.split('_')[1], // e.g. maintenance_create -> create
        proposal.parameters
      );
      
      // Update proposal with execution result
      if (actionResult.success) {
        await proposal.setExecuted(
          true,
          'Action executed successfully',
          actionResult.data
        );
      } else {
        await proposal.setExecuted(
          false,
          actionResult.error || 'Action execution failed',
          {}
        );
      }
      
      // Create a response to inform the user of the result
      const context = await contextService.getContext(proposal.contextId);
      
      // Create a query record for the system message
      const agentQuery = await AgentQuery.query().insert({
        text: 'ACTION_APPROVAL',
        contextId: context.id
      });
      
      // Generate response text from template
      const responseText = await responseGeneratorService.generateSystemResponse(
        actionResult.success ? 'action_approved' : 'action_error',
        { 
          action_description: proposal.description,
          result_summary: actionResult.success ? actionResult.summary || '' : '',
          error_message: actionResult.error || 'Unknown error'
        }
      );
      
      // Create response record
      const agentResponse = await AgentResponse.query().insert({
        queryId: agentQuery.id,
        contextId: context.id,
        text: responseText
      });
      
      // Add agent message to context
      await contextService.addAgentMessage(context.id, responseText, agentResponse.id);
      
      // Broadcast action result if WebSocket is available
      if (wsService) {
        // Turn off typing indicator
        wsService.broadcastTypingIndicator(proposal.contextId, false);
        
        // Broadcast the action result
        wsService.broadcastActionResult(proposal.contextId, {
          success: actionResult.success,
          message: responseText,
          responseId: agentResponse.id
        });
        
        // Also broadcast as an agent response
        wsService.broadcastAgentResponse(proposal.contextId, {
          id: agentResponse.id,
          text: responseText,
          visualizations: []
        });
      }
      
      return {
        success: actionResult.success,
        message: responseText,
        data: actionResult.data || {},
        responseId: agentResponse.id,
        contextId: context.id
      };
    } catch (error) {
      logger.error(`Action approval error: ${error.message}`);
      
      // Get WebSocket service for error notification
      const wsService = getWebSocketService();
      if (wsService && proposalId) {
        // Get context ID from proposal
        let contextId;
        try {
          const proposal = await ActionProposal.query().findById(proposalId);
          if (proposal) {
            contextId = proposal.contextId;
            
            // Turn off typing indicator
            wsService.broadcastTypingIndicator(contextId, false);
            
            // Broadcast error
            wsService.broadcastError(userId, `Failed to approve action: ${error.message}`);
          }
        } catch (e) {
          // Ignore errors retrieving the proposal
        }
      }
      
      throw new Error(`Failed to approve action: ${error.message}`);
    }
  }

  /**
   * Process an action rejection
   * @param {string} proposalId - The action proposal ID
   * @param {string} userId - The user ID
   * @param {string} reason - Optional rejection reason
   * @returns {Promise<Object>} - Processing result
   */
  async processRejection(proposalId, userId, reason = null) {
    try {
      logger.info(`Processing rejection for proposal ${proposalId} by user ${userId}`);
      
      // Get the action proposal
      const proposal = await ActionProposal.query().findById(proposalId);
      
      if (!proposal) {
        throw new Error(`Action proposal not found: ${proposalId}`);
      }
      
      // Verify user
      if (proposal.userId !== userId) {
        throw new Error(`User ${userId} is not authorized to reject this action`);
      }
      
      // Check if proposal is still pending
      if (proposal.status !== 'pending') {
        throw new Error(`Action proposal is not pending: ${proposal.status}`);
      }
      
      // Reject the proposal
      await proposal.reject(reason);
      
      // Create a response to inform the user
      const context = await contextService.getContext(proposal.contextId);
      
      // Create a query record for the system message
      const agentQuery = await AgentQuery.query().insert({
        text: 'ACTION_REJECTION',
        contextId: context.id
      });
      
      // Generate response text from template
      const responseText = await responseGeneratorService.generateSystemResponse(
        'action_rejected',
        { 
          action_description: proposal.description,
          reason: reason ? `Reason: ${reason}` : ''
        }
      );
      
      // Create response record
      const agentResponse = await AgentResponse.query().insert({
        queryId: agentQuery.id,
        contextId: context.id,
        text: responseText
      });
      
      // Add agent message to context
      await contextService.addAgentMessage(context.id, responseText, agentResponse.id);
      
      // Broadcast action result if WebSocket is available
      const wsService = getWebSocketService();
      if (wsService) {
        // Broadcast the action result
        wsService.broadcastActionResult(proposal.contextId, {
          success: false,
          message: responseText,
          responseId: agentResponse.id
        });
        
        // Also broadcast as an agent response
        wsService.broadcastAgentResponse(proposal.contextId, {
          id: agentResponse.id,
          text: responseText,
          visualizations: []
        });
      }
      
      return {
        success: true,
        message: responseText,
        responseId: agentResponse.id,
        contextId: context.id
      };
    } catch (error) {
      logger.error(`Action rejection error: ${error.message}`);
      
      // Get WebSocket service for error notification
      const wsService = getWebSocketService();
      if (wsService && proposalId) {
        // Get context ID from proposal
        let contextId;
        try {
          const proposal = await ActionProposal.query().findById(proposalId);
          if (proposal) {
            contextId = proposal.contextId;
            
            // Broadcast error
            wsService.broadcastError(userId, `Failed to reject action: ${error.message}`);
          }
        } catch (e) {
          // Ignore errors retrieving the proposal
        }
      }
      
      throw new Error(`Failed to reject action: ${error.message}`);
    }
  }

  /**
   * Save an insight from an agent response
   * @param {string} responseId - The response ID
   * @param {string} userId - The user ID
   * @param {string} title - The insight title
   * @param {string} category - The insight category
   * @param {string} notes - Optional user notes
   * @returns {Promise<Object>} - The saved insight
   */
  async saveInsight(responseId, userId, title, category, notes = null) {
    try {
      logger.info(`Saving insight from response ${responseId} for user ${userId}`);
      
      // Get the response
      const response = await AgentResponse.query().findById(responseId);
      
      if (!response) {
        throw new Error(`Response not found: ${responseId}`);
      }
      
      // Create insight
      const insight = await AgentInsight.query().insert({
        responseId,
        userId,
        title,
        category,
        notes
      });
      
      return {
        id: insight.id,
        title: insight.title,
        category: insight.category,
        createdAt: insight.createdAt
      };
    } catch (error) {
      logger.error(`Insight saving error: ${error.message}`);
      throw new Error(`Failed to save insight: ${error.message}`);
    }
  }

  /**
   * Get insights for a user
   * @param {string} userId - The user ID
   * @param {string} category - Optional category filter
   * @param {number} limit - Maximum number of insights to retrieve
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - The user's insights
   */
  async getInsights(userId, category = null, limit = 10, offset = 0) {
    try {
      logger.info(`Getting insights for user ${userId}`);
      
      // Build query
      let query = AgentInsight.query()
        .where('userId', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Apply category filter if provided
      if (category) {
        query = query.where('category', category);
      }
      
      // Execute query
      const insights = await query;
      
      // Get total count for pagination
      const countQuery = AgentInsight.query()
        .where('userId', userId)
        .count('id as total');
      
      // Apply category filter to count query if provided
      if (category) {
        countQuery.where('category', category);
      }
      
      const countResult = await countQuery.first();
      const total = countResult ? parseInt(countResult.total) : 0;
      
      return {
        insights,
        total,
        limit,
        offset
      };
    } catch (error) {
      logger.error(`Insights retrieval error: ${error.message}`);
      throw new Error(`Failed to retrieve insights: ${error.message}`);
    }
  }

  /**
   * Get an insight by ID
   * @param {string} insightId - The insight ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - The insight with response data
   */
  async getInsight(insightId, userId) {
    try {
      logger.info(`Getting insight ${insightId} for user ${userId}`);
      
      // Get the insight with related response
      const insight = await AgentInsight.query()
        .findById(insightId)
        .withGraphFetched('response');
      
      if (!insight) {
        throw new Error(`Insight not found: ${insightId}`);
      }
      
      // Check user
      if (insight.userId !== userId) {
        throw new Error(`User ${userId} is not authorized to access this insight`);
      }
      
      return insight;
    } catch (error) {
      logger.error(`Insight retrieval error: ${error.message}`);
      throw new Error(`Failed to retrieve insight: ${error.message}`);
    }
  }

  /**
   * Process feedback for an agent response
   * @param {string} responseId - The response ID
   * @param {number} rating - The feedback rating (1-5)
   * @param {string} comment - Optional feedback comment
   * @param {Object} metadata - Optional metadata about the feedback
   * @returns {Promise<Object>} - The feedback result
   */
  async processFeedback(responseId, rating, comment = null, metadata = {}) {
    try {
      logger.info(`Processing feedback for response ${responseId}: Rating ${rating}`);
      
      // Get the response
      const response = await AgentResponse.query().findById(responseId);
      
      if (!response) {
        throw new Error(`Response not found: ${responseId}`);
      }
      
      // Update response with feedback
      await response.addFeedback(rating, comment);
      
      // Get context and query for additional info
      const context = await contextService.getContext(response.contextId);
      const query = await AgentQuery.query().findById(response.queryId);
      
      // Enhance metadata with context information
      const enhancedMetadata = {
        ...metadata,
        queryType: query ? query.parsedIntent : null,
        responseLength: response.text ? response.text.length : 0,
        hasVisualizations: response.visualizations && response.visualizations.length > 0,
        visualizationTypes: response.visualizations 
          ? response.visualizations.map(v => v.type)
          : []
      };
      
      // Create feedback record for learning
      if (feedbackLearningService) {
        const feedbackData = {
          targetType: 'response',
          targetId: responseId,
          userId: context ? context.userId : 'anonymous',
          rating,
          comment,
          metadata: enhancedMetadata
        };
        
        // Process through feedback learning service
        await feedbackLearningService.processFeedback(feedbackData);
      }
      
      return {
        success: true,
        message: 'Feedback recorded and processed successfully'
      };
    } catch (error) {
      logger.error(`Feedback processing error: ${error.message}`);
      throw new Error(`Failed to process feedback: ${error.message}`);
    }
  }
  
  /**
   * Track user behavior for implicit feedback
   * @param {string} userId - User ID 
   * @param {string} targetType - Type of target (response, insight, etc.)
   * @param {string} targetId - ID of the target
   * @param {string} behaviorType - Type of behavior (click, save, implement, etc.)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<boolean>} - Success indicator
   */
  async trackUserBehavior(userId, targetType, targetId, behaviorType, metadata = {}) {
    try {
      logger.debug(`Tracking ${behaviorType} behavior for ${targetType} ${targetId} by user ${userId}`);
      
      // Skip if missing required data
      if (!userId || !targetType || !targetId || !behaviorType) {
        logger.warn('Missing required data for behavior tracking');
        return false;
      }
      
      // Process as implicit feedback if feedback learning service is available
      if (feedbackLearningService) {
        await feedbackLearningService.processImplicitFeedback({
          userId,
          targetType,
          targetId,
          type: behaviorType,
          metadata
        });
      }
      
      return true;
    } catch (error) {
      logger.error(`Error tracking user behavior: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get feedback metrics for a specific user
   * @param {string} userId - User ID
   * @param {string} responseType - Optional response type filter
   * @returns {Promise<Object>} - Feedback metrics
   */
  async getUserFeedbackMetrics(userId, responseType = null) {
    try {
      logger.debug(`Getting feedback metrics for user ${userId}`);
      
      if (feedbackLearningService) {
        return await feedbackLearningService.getUserResponseQuality(userId, responseType);
      }
      
      // Fallback to basic metrics if no feedback learning service
      const query = { userId };
      if (responseType) {
        query.targetType = responseType;
      }
      
      const feedback = await Feedback.query().where(query);
      
      if (!feedback || feedback.length === 0) {
        return {
          averageRating: null,
          totalFeedback: 0
        };
      }
      
      const totalRating = feedback.reduce((sum, item) => sum + item.rating, 0);
      const averageRating = totalRating / feedback.length;
      
      return {
        averageRating,
        totalFeedback: feedback.length
      };
    } catch (error) {
      logger.error(`Error getting user feedback metrics: ${error.message}`);
      return {
        error: error.message,
        totalFeedback: 0
      };
    }
  }
  
  /**
   * Get global feedback metrics across all users
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Global metrics
   */
  async getGlobalFeedbackMetrics(options = {}) {
    try {
      logger.debug('Getting global feedback metrics');
      
      if (feedbackLearningService) {
        return await feedbackLearningService.getGlobalFeedbackMetrics(options);
      }
      
      // Fallback to basic metrics if no feedback learning service
      const feedback = await Feedback.query();
      
      if (!feedback || feedback.length === 0) {
        return {
          averageRating: null,
          totalFeedback: 0
        };
      }
      
      const totalRating = feedback.reduce((sum, item) => sum + item.rating, 0);
      const averageRating = totalRating / feedback.length;
      
      return {
        averageRating,
        totalFeedback: feedback.length
      };
    } catch (error) {
      logger.error(`Error getting global feedback metrics: ${error.message}`);
      return {
        error: error.message,
        totalFeedback: 0
      };
    }
  }
}

module.exports = new AgentService();