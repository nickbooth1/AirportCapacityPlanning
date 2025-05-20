/**
 * ReasoningController.js
 * 
 * Controller for handling multi-step reasoning routes
 */

const OpenAIService = require('../../services/agent/OpenAIService');
const MultiStepReasoningService = require('../../services/agent/MultiStepReasoningService');
const ReasoningExplainer = require('../../services/agent/ReasoningExplainer');
const AgentResponse = require('../../models/agent/AgentResponse');
const ReasoningProcess = require('../../models/agent/ReasoningProcess');
const ReasoningFeedback = require('../../models/agent/ReasoningFeedback');
const contextService = require('../../services/agent/ContextService');
const logger = require('../../utils/logger');

/**
 * Fetch data for a specific reasoning process
 */
exports.getReasoningData = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch the reasoning process
    const reasoningProcess = await ReasoningProcess.query().findById(id);
    
    if (!reasoningProcess) {
      return res.status(404).json({
        success: false,
        error: 'Reasoning process not found'
      });
    }
    
    // Return the reasoning data
    return res.json({
      success: true,
      data: reasoningProcess.toJSON()
    });
  } catch (error) {
    logger.error(`Error fetching reasoning data: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reasoning data'
    });
  }
};

/**
 * Fetch history of reasoning processes for a context
 */
exports.getReasoningHistory = async (req, res) => {
  try {
    const { contextId } = req.params;
    
    // Fetch reasoning processes for this context
    const reasoningProcesses = await ReasoningProcess.query()
      .where('contextId', contextId)
      .orderBy('createdAt', 'desc');
    
    return res.json({
      success: true,
      data: reasoningProcesses.map(process => ({
        id: process.id,
        queryTitle: process.queryTitle,
        query: process.originalQuery,
        stepCount: process.steps ? process.steps.length : 0,
        confidence: process.confidence,
        timestamp: process.createdAt,
        tags: process.tags
      }))
    });
  } catch (error) {
    logger.error(`Error fetching reasoning history: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reasoning history'
    });
  }
};

/**
 * Initiate a new reasoning process
 */
exports.initiateReasoning = async (req, res) => {
  try {
    const { query, contextId } = req.body;
    const userId = req.user.id;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    // Get or create context
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
    
    // Get conversation history for context
    const history = await contextService.getConversationHistory(context.id);
    
    // Use enhanced reasoning for this query
    const reasoningResult = await OpenAIService.processComplexCapacityQuery(
      query,
      history,
      { contextId: context.id }
    );
    
    // Create a new reasoning process record
    const reasoningProcess = await ReasoningProcess.query().insert({
      userId,
      contextId: context.id,
      originalQuery: query,
      queryTitle: `Query ${new Date().toLocaleString()}`,
      steps: reasoningResult.reasoning.steps,
      approach: reasoningResult.reasoning.approach,
      insights: reasoningResult.insights,
      limitations: reasoningResult.reasoning.limitations,
      confidence: reasoningResult.reasoning.confidence,
      tags: reasoningResult.reasoning.tags || []
    });
    
    // Return the reasoning process ID
    return res.json({
      success: true,
      data: {
        reasoningId: reasoningProcess.id,
        contextId: context.id
      }
    });
  } catch (error) {
    logger.error(`Error initiating reasoning process: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate reasoning process'
    });
  }
};

/**
 * Execute a reasoning step
 */
exports.executeReasoningStep = async (req, res) => {
  try {
    const { reasoningId, stepId } = req.params;
    
    // Fetch the reasoning process
    const reasoningProcess = await ReasoningProcess.query().findById(reasoningId);
    
    if (!reasoningProcess) {
      return res.status(404).json({
        success: false,
        error: 'Reasoning process not found'
      });
    }
    
    // Find the step
    const step = reasoningProcess.steps.find(s => s.stepId === stepId);
    
    if (!step) {
      return res.status(404).json({
        success: false,
        error: 'Step not found'
      });
    }
    
    // Create a context object for step execution
    const context = {
      userId: req.user.id,
      contextId: reasoningProcess.contextId,
      originalQuery: reasoningProcess.originalQuery
    };
    
    // Get previous step results if any
    const explanations = reasoningProcess.explanations || [];
    const previousResults = explanations.map(exp => ({
      stepId: exp.stepId,
      result: exp.result,
      success: exp.success
    }));
    
    // Execute the step
    const stepResult = await MultiStepReasoningService.executeStep(
      step,
      context,
      previousResults
    );
    
    // Generate an explanation for the step
    const explanation = await ReasoningExplainer.explainStep(
      step,
      previousResults.map(r => {
        const s = reasoningProcess.steps.find(s => s.stepId === r.stepId);
        return s ? {...s, result: r.result} : null;
      }).filter(Boolean)
    );
    
    // Add the result to the explanations
    const updatedExplanations = [
      ...explanations.filter(e => e.stepId !== step.stepId),
      {
        stepId: step.stepId,
        stepNumber: step.stepNumber,
        explanation,
        result: stepResult.result,
        success: stepResult.success,
        executionTime: stepResult.executionTime
      }
    ];
    
    // Update the reasoning process
    await reasoningProcess.$query().patch({
      explanations: updatedExplanations
    });
    
    return res.json({
      success: true,
      data: {
        step,
        result: stepResult,
        explanation
      }
    });
  } catch (error) {
    logger.error(`Error executing reasoning step: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute reasoning step'
    });
  }
};

/**
 * Get explanation for a specific step
 */
exports.getStepExplanation = async (req, res) => {
  try {
    const { reasoningId, stepId } = req.params;
    
    // Fetch the reasoning process
    const reasoningProcess = await ReasoningProcess.query().findById(reasoningId);
    
    if (!reasoningProcess) {
      return res.status(404).json({
        success: false,
        error: 'Reasoning process not found'
      });
    }
    
    // Find the step
    const step = reasoningProcess.steps.find(s => s.stepId === stepId);
    
    if (!step) {
      return res.status(404).json({
        success: false,
        error: 'Step not found'
      });
    }
    
    // Find the explanation
    const explanation = reasoningProcess.explanations?.find(e => e.stepId === stepId);
    
    if (explanation) {
      return res.json({
        success: true,
        data: explanation
      });
    }
    
    // If no existing explanation, generate one
    const explanations = reasoningProcess.explanations || [];
    const previousSteps = reasoningProcess.steps
      .filter(s => s.stepNumber < step.stepNumber)
      .map(s => {
        const exp = explanations.find(e => e.stepId === s.stepId);
        return exp ? {...s, result: exp.result} : s;
      });
    
    const newExplanation = await ReasoningExplainer.explainStep(step, previousSteps);
    
    return res.json({
      success: true,
      data: {
        stepId,
        stepNumber: step.stepNumber,
        explanation: newExplanation
      }
    });
  } catch (error) {
    logger.error(`Error getting step explanation: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to get step explanation'
    });
  }
};

/**
 * Save feedback for a reasoning process
 */
exports.saveReasoningFeedback = async (req, res) => {
  try {
    const { reasoningId } = req.params;
    const { rating, comment, improvements } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }
    
    // Check if reasoning process exists
    const reasoningProcess = await ReasoningProcess.query().findById(reasoningId);
    
    if (!reasoningProcess) {
      return res.status(404).json({
        success: false,
        error: 'Reasoning process not found'
      });
    }
    
    // Save feedback
    const feedback = await ReasoningFeedback.query().insert({
      reasoningId,
      userId,
      rating,
      comment: comment || null,
      improvements: improvements || []
    });
    
    return res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    logger.error(`Error saving reasoning feedback: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to save reasoning feedback'
    });
  }
};

/**
 * Get insights for a reasoning process
 */
exports.getReasoningInsights = async (req, res) => {
  try {
    const { reasoningId } = req.params;
    
    // Fetch the reasoning process
    const reasoningProcess = await ReasoningProcess.query().findById(reasoningId);
    
    if (!reasoningProcess) {
      return res.status(404).json({
        success: false,
        error: 'Reasoning process not found'
      });
    }
    
    // If insights already exist, return them
    if (reasoningProcess.insights && reasoningProcess.insights.length > 0) {
      return res.json({
        success: true,
        data: reasoningProcess.insights
      });
    }
    
    // Generate insights based on the reasoning process
    const insights = await OpenAIService.extractKeyInsights(
      {
        steps: reasoningProcess.steps,
        approach: reasoningProcess.approach,
        explanations: reasoningProcess.explanations,
        limitations: reasoningProcess.limitations
      },
      reasoningProcess.originalQuery
    );
    
    // Update the reasoning process with the insights
    await reasoningProcess.$query().patch({
      insights
    });
    
    return res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error(`Error getting reasoning insights: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to get reasoning insights'
    });
  }
};