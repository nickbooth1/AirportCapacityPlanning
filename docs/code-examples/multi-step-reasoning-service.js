/**
 * MultiStepReasoningService.js
 * 
 * Service for handling complex queries that require multiple reasoning steps
 */

const OpenAIService = require('./OpenAIService');
const ParameterValidationService = require('./ParameterValidationService');
const WorkingMemoryService = require('./WorkingMemoryService');
const logger = require('../../utils/logger');

class MultiStepReasoningService {
  constructor() {
    this.paramValidator = new ParameterValidationService();
    this.workingMemory = new WorkingMemoryService();
  }

  /**
   * Generate a planning sequence for a complex query
   * @param {string} query - The natural language query
   * @param {Object} context - Additional context information
   * @returns {Promise<Object>} - A plan with step sequence
   */
  async planQuerySteps(query, context = {}) {
    try {
      logger.info(`Planning steps for query: ${query}`);
      
      // Use OpenAI to generate a reasoning plan
      const planResult = await OpenAIService.performMultiStepReasoning(query, context);
      
      // Extract and validate the steps
      const steps = planResult.steps || [];
      
      // Validate the plan feasibility
      const feasibilityCheck = await this.validatePlanFeasibility(steps, context);
      
      if (!feasibilityCheck.isValid) {
        logger.warn(`Plan feasibility check failed: ${feasibilityCheck.reason}`);
        return {
          status: 'invalid_plan',
          reason: feasibilityCheck.reason,
          suggestedAlternative: feasibilityCheck.suggestedAlternative
        };
      }
      
      // Create a structured plan
      const plan = {
        queryId: generateUniqueId(),
        originalQuery: query,
        steps: steps.map((step, index) => ({
          stepId: `step-${index + 1}`,
          stepNumber: index + 1,
          description: step.description,
          type: determineStepType(step),
          dependsOn: step.dependsOn || [],
          parameters: step.parameters || {},
          estimatedExecutionTime: estimateExecutionTime(step)
        })),
        totalSteps: steps.length,
        estimatedTotalTime: calculateTotalTime(steps),
        confidence: planResult.confidence || 0.7
      };
      
      // Store the plan in working memory
      await this.workingMemory.storePlan(plan);
      
      return plan;
    } catch (error) {
      logger.error(`Error generating reasoning plan: ${error.message}`);
      throw new Error(`Failed to plan query steps: ${error.message}`);
    }
  }
  
  /**
   * Execute a sequence of reasoning steps
   * @param {Object} plan - The reasoning plan
   * @param {Object} context - Additional context and parameters
   * @returns {Promise<Object>} - The results of the reasoning process
   */
  async executeStepSequence(plan, context = {}) {
    try {
      logger.info(`Executing reasoning plan for query: ${plan.originalQuery}`);
      
      const results = {
        queryId: plan.queryId,
        originalQuery: plan.originalQuery,
        stepResults: [],
        finalAnswer: null,
        executionTime: 0,
        success: true
      };
      
      const startTime = Date.now();
      
      // Execute each step in sequence, respecting dependencies
      for (const step of plan.steps) {
        logger.info(`Executing step ${step.stepNumber}: ${step.description}`);
        
        // Check if dependencies are fulfilled
        if (step.dependsOn.length > 0) {
          const dependenciesFulfilled = this.checkDependencies(step.dependsOn, results.stepResults);
          if (!dependenciesFulfilled) {
            logger.error(`Dependencies not fulfilled for step ${step.stepNumber}`);
            results.success = false;
            results.error = `Dependencies not fulfilled for step ${step.stepNumber}`;
            break;
          }
        }
        
        // Execute the specific step type
        const stepResult = await this.executeStep(step, context, results.stepResults);
        
        // Store step result
        results.stepResults.push({
          stepId: step.stepId,
          stepNumber: step.stepNumber,
          result: stepResult.result,
          success: stepResult.success,
          executionTime: stepResult.executionTime
        });
        
        // Update working memory with intermediate results
        await this.workingMemory.storeStepResult(plan.queryId, step.stepId, stepResult);
        
        // If step failed, stop execution
        if (!stepResult.success) {
          logger.error(`Step ${step.stepNumber} failed: ${stepResult.error}`);
          results.success = false;
          results.error = `Step ${step.stepNumber} failed: ${stepResult.error}`;
          break;
        }
      }
      
      // If all steps succeeded, generate final answer
      if (results.success) {
        const finalAnswer = await this.generateFinalAnswer(plan, results.stepResults, context);
        results.finalAnswer = finalAnswer;
        
        // Store final result in working memory
        await this.workingMemory.storeFinalResult(plan.queryId, finalAnswer);
      }
      
      const endTime = Date.now();
      results.executionTime = (endTime - startTime) / 1000;
      
      return results;
    } catch (error) {
      logger.error(`Error executing reasoning steps: ${error.message}`);
      throw new Error(`Failed to execute reasoning steps: ${error.message}`);
    }
  }
  
  /**
   * Execute a single reasoning step
   * @param {Object} step - The step to execute
   * @param {Object} context - Global context
   * @param {Array} previousResults - Results from previous steps
   * @returns {Promise<Object>} - The result of this step
   */
  async executeStep(step, context, previousResults) {
    const startTime = Date.now();
    try {
      // Different handling based on step type
      switch (step.type) {
        case 'calculation':
          return await this.executeCalculationStep(step, context, previousResults);
          
        case 'parameter_extraction':
          return await this.executeParameterExtractionStep(step, context, previousResults);
          
        case 'data_retrieval':
          return await this.executeDataRetrievalStep(step, context, previousResults);
          
        case 'validation':
          return await this.executeValidationStep(step, context, previousResults);
          
        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        error: error.message,
        executionTime: (endTime - startTime) / 1000
      };
    }
  }
  
  /**
   * Check if all dependencies for a step are fulfilled
   * @param {Array} dependencies - Array of step IDs this step depends on
   * @param {Array} previousResults - Results from previous steps
   * @returns {boolean} - Whether dependencies are fulfilled
   */
  checkDependencies(dependencies, previousResults) {
    return dependencies.every(depId => {
      const depResult = previousResults.find(r => r.stepId === depId);
      return depResult && depResult.success;
    });
  }
  
  /**
   * Validate the feasibility of a reasoning plan
   * @param {Array} steps - The reasoning steps
   * @param {Object} context - Context information
   * @returns {Promise<Object>} - Validation result
   */
  async validatePlanFeasibility(steps, context) {
    try {
      // Check for circular dependencies
      const dependencyGraph = {};
      for (const step of steps) {
        dependencyGraph[step.stepNumber] = step.dependsOn?.map(depId => {
          const match = depId.match(/step-(\d+)/);
          return match ? parseInt(match[1]) : null;
        }).filter(Boolean) || [];
      }
      
      const hasCycle = detectCycle(dependencyGraph);
      if (hasCycle) {
        return {
          isValid: false,
          reason: 'Circular dependency detected in plan',
          suggestedAlternative: 'Rephrase query to avoid circular reasoning'
        };
      }
      
      // Check for missing required parameters
      for (const step of steps) {
        if (step.parameters) {
          const missingParams = [];
          
          // Check each required parameter
          for (const [key, value] of Object.entries(step.requiredParameters || {})) {
            if (!step.parameters[key] && !canBeResolvedFromContext(key, context)) {
              missingParams.push(key);
            }
          }
          
          if (missingParams.length > 0) {
            return {
              isValid: false,
              reason: `Missing required parameters: ${missingParams.join(', ')}`,
              suggestedAlternative: 'Provide additional details in your query'
            };
          }
        }
      }
      
      return { isValid: true };
    } catch (error) {
      logger.error(`Error validating plan feasibility: ${error.message}`);
      return {
        isValid: false,
        reason: `Validation error: ${error.message}`,
        suggestedAlternative: 'Try a simpler query or provide more specific information'
      };
    }
  }
  
  /**
   * Generate a final answer based on all step results
   * @param {Object} plan - The original plan
   * @param {Array} stepResults - Results from all steps
   * @param {Object} context - Global context
   * @returns {Promise<Object>} - Final answer
   */
  async generateFinalAnswer(plan, stepResults, context) {
    try {
      // Collect all relevant information for final synthesis
      const inputs = stepResults.map(result => {
        return {
          stepDescription: plan.steps.find(s => s.stepId === result.stepId)?.description,
          stepResult: result.result
        };
      });
      
      // Use OpenAI to synthesize a final answer
      const synthesisPrompt = `
      Based on the following reasoning steps and results, provide a comprehensive answer to the original query:
      
      Original Query: ${plan.originalQuery}
      
      Reasoning Steps:
      ${inputs.map((input, i) => `Step ${i+1}: ${input.stepDescription}\nResult: ${JSON.stringify(input.stepResult)}`).join('\n\n')}
      
      Please provide a clear, concise answer that directly addresses the original query.
      Include supporting evidence from the reasoning steps.
      If there are limitations or uncertainties in your answer, acknowledge them.
      `;
      
      const synthesisResult = await OpenAIService.processQuery(synthesisPrompt);
      
      return {
        answer: synthesisResult.text,
        confidence: plan.confidence,
        supportingEvidence: inputs.map(input => ({
          description: input.stepDescription,
          summary: summarizeResult(input.stepResult)
        }))
      };
    } catch (error) {
      logger.error(`Error generating final answer: ${error.message}`);
      throw new Error(`Failed to generate final answer: ${error.message}`);
    }
  }
  
  /**
   * Execute a calculation step
   * @param {Object} step - Step definition
   * @param {Object} context - Global context
   * @param {Array} previousResults - Results from previous steps
   * @returns {Promise<Object>} - Calculation result
   */
  async executeCalculationStep(step, context, previousResults) {
    // Implementation would depend on the specific calculation types needed
    const startTime = Date.now();
    
    try {
      // Example implementation
      const result = { calculated: true, value: 42 }; // Replace with actual calculation
      
      const endTime = Date.now();
      return {
        success: true,
        result,
        executionTime: (endTime - startTime) / 1000
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        error: `Calculation error: ${error.message}`,
        executionTime: (endTime - startTime) / 1000
      };
    }
  }
  
  /**
   * Execute a parameter extraction step
   * @param {Object} step - Step definition
   * @param {Object} context - Global context
   * @param {Array} previousResults - Results from previous steps
   * @returns {Promise<Object>} - Extraction result
   */
  async executeParameterExtractionStep(step, context, previousResults) {
    const startTime = Date.now();
    
    try {
      // Use OpenAI to extract parameters from the text
      const extractionResult = await OpenAIService.extractParameters(
        step.parameters.text || context.originalQuery
      );
      
      // Validate the extracted parameters
      const validationResult = await this.paramValidator.validateParameters(
        extractionResult.parameters,
        step.parameters.validationSchema
      );
      
      const endTime = Date.now();
      
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Parameter validation failed: ${validationResult.errors.join(', ')}`,
          partialResult: extractionResult.parameters,
          executionTime: (endTime - startTime) / 1000
        };
      }
      
      return {
        success: true,
        result: {
          parameters: extractionResult.parameters,
          confidence: extractionResult.confidence,
          reasoning: extractionResult.reasoning
        },
        executionTime: (endTime - startTime) / 1000
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        error: `Parameter extraction error: ${error.message}`,
        executionTime: (endTime - startTime) / 1000
      };
    }
  }
  
  /**
   * Execute a data retrieval step
   * @param {Object} step - Step definition
   * @param {Object} context - Global context
   * @param {Array} previousResults - Results from previous steps
   * @returns {Promise<Object>} - Retrieved data
   */
  async executeDataRetrievalStep(step, context, previousResults) {
    // Implementation would depend on the specific data sources
    const startTime = Date.now();
    
    try {
      // Example implementation
      const result = { data: "Example data" }; // Replace with actual data retrieval
      
      const endTime = Date.now();
      return {
        success: true,
        result,
        executionTime: (endTime - startTime) / 1000
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        error: `Data retrieval error: ${error.message}`,
        executionTime: (endTime - startTime) / 1000
      };
    }
  }
  
  /**
   * Execute a validation step
   * @param {Object} step - Step definition
   * @param {Object} context - Global context
   * @param {Array} previousResults - Results from previous steps
   * @returns {Promise<Object>} - Validation result
   */
  async executeValidationStep(step, context, previousResults) {
    const startTime = Date.now();
    
    try {
      // Get the data to validate from previous steps or context
      const dataToValidate = step.parameters.dataSource === 'previous_step'
        ? previousResults.find(r => r.stepId === step.parameters.stepId)?.result
        : step.parameters.data || context[step.parameters.contextKey];
      
      // Validate against schema
      const validationResult = await this.paramValidator.validateAgainstSchema(
        dataToValidate,
        step.parameters.validationSchema
      );
      
      const endTime = Date.now();
      
      return {
        success: validationResult.isValid,
        result: {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          validatedData: validationResult.isValid ? dataToValidate : null
        },
        error: validationResult.isValid ? null : `Validation failed: ${validationResult.errors.join(', ')}`,
        executionTime: (endTime - startTime) / 1000
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        error: `Validation error: ${error.message}`,
        executionTime: (endTime - startTime) / 1000
      };
    }
  }
}

// Helper functions
function generateUniqueId() {
  return `query-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function determineStepType(step) {
  // Determine step type based on description and parameters
  if (step.type) return step.type;
  
  const desc = step.description.toLowerCase();
  if (desc.includes('calculat') || desc.includes('comput')) return 'calculation';
  if (desc.includes('extract') || desc.includes('identif')) return 'parameter_extraction';
  if (desc.includes('retriev') || desc.includes('fetch') || desc.includes('get')) return 'data_retrieval';
  if (desc.includes('validat') || desc.includes('verify') || desc.includes('check')) return 'validation';
  
  return 'generic';
}

function estimateExecutionTime(step) {
  // Rough estimate based on step type
  switch (determineStepType(step)) {
    case 'calculation': return 2.0; // seconds
    case 'parameter_extraction': return 3.5;
    case 'data_retrieval': return 1.5;
    case 'validation': return 0.5;
    default: return 1.0;
  }
}

function calculateTotalTime(steps) {
  return steps.reduce((total, step) => total + estimateExecutionTime(step), 0);
}

function detectCycle(graph) {
  const visited = new Set();
  const recursionStack = new Set();
  
  function dfs(node) {
    if (recursionStack.has(node)) return true;
    if (visited.has(node)) return false;
    
    visited.add(node);
    recursionStack.add(node);
    
    for (const neighbor of graph[node] || []) {
      if (dfs(neighbor)) return true;
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  for (const node in graph) {
    if (dfs(parseInt(node))) return true;
  }
  
  return false;
}

function canBeResolvedFromContext(paramKey, context) {
  return context.hasOwnProperty(paramKey) || 
         (context.parameters && context.parameters.hasOwnProperty(paramKey));
}

function summarizeResult(result) {
  if (typeof result === 'object') {
    // Create a brief summary of the result object
    return Object.entries(result)
      .filter(([key]) => key !== 'detailed' && key !== 'raw')
      .map(([key, value]) => `${key}: ${
        typeof value === 'object' 
          ? (Array.isArray(value) ? `[${value.length} items]` : '{...}') 
          : value
      }`)
      .join(', ');
  }
  
  return String(result);
}

module.exports = MultiStepReasoningService;