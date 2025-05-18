/**
 * MultiStepReasoningService.js
 * 
 * Service for handling complex queries that require multiple reasoning steps
 */

const OpenAIService = require('./OpenAIService');
const ContextService = require('./ContextService');
const ReasoningExplainer = require('./ReasoningExplainer');
const logger = require('../../utils/logger');

class MultiStepReasoningService {
  constructor() {
    this.contextService = new ContextService();
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
        queryId: this.generateUniqueId(),
        originalQuery: query,
        steps: steps.map((step, index) => ({
          stepId: `step-${index + 1}`,
          stepNumber: index + 1,
          description: step.description,
          type: this.determineStepType(step),
          dependsOn: step.dependsOn || [],
          parameters: step.parameters || {},
          estimatedExecutionTime: this.estimateExecutionTime(step)
        })),
        totalSteps: steps.length,
        estimatedTotalTime: this.calculateTotalTime(steps),
        confidence: planResult.confidence || 0.7
      };
      
      // Store the plan in context service
      await this.contextService.set(`plan:${plan.queryId}`, plan);
      
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
        explanations: [],
        stepExecutionSummary: null,
        finalAnswer: null,
        executionTime: 0,
        success: true
      };
      
      // Generate an overall reasoning approach explanation
      try {
        results.stepExecutionSummary = await ReasoningExplainer.explainReasoning(
          plan.steps,
          plan.originalQuery
        );
      } catch (explainError) {
        logger.warn(`Failed to generate reasoning explanation: ${explainError.message}`);
      }
      
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
        
        // Generate explanation for this step
        let explanation = null;
        try {
          explanation = await ReasoningExplainer.explainStep(
            step, 
            results.stepResults.map(r => {
              const planStep = plan.steps.find(s => s.stepId === r.stepId);
              return planStep ? {...planStep, result: r.result} : null;
            }).filter(Boolean)
          );
        } catch (explainError) {
          logger.warn(`Failed to generate step explanation: ${explainError.message}`);
          explanation = step.description;
        }
        
        // Store step result
        results.stepResults.push({
          stepId: step.stepId,
          stepNumber: step.stepNumber,
          result: stepResult.result,
          explanation: explanation,
          success: stepResult.success,
          executionTime: stepResult.executionTime
        });
        
        // Add to explanations array
        results.explanations.push({
          stepNumber: step.stepNumber,
          description: step.description,
          explanation: explanation,
          success: stepResult.success
        });
        
        // Update context service with intermediate results
        await this.contextService.set(`stepResult:${plan.queryId}:${step.stepId}`, stepResult);
        
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
        
        // Store final result in context service
        await this.contextService.set(`finalResult:${plan.queryId}`, finalAnswer);
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
        
        case 'comparison':
          return await this.executeComparisonStep(step, context, previousResults);
        
        case 'recommendation':
          return await this.executeRecommendationStep(step, context, previousResults);
          
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
      
      const hasCycle = this.detectCycle(dependencyGraph);
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
            if (!step.parameters[key] && !this.canBeResolvedFromContext(key, context)) {
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
          stepExplanation: result.explanation,
          stepResult: result.result
        };
      });
      
      // Use OpenAI to synthesize a final answer
      const synthesisPrompt = `
      Based on the following reasoning steps and results, provide a comprehensive answer to the original query:
      
      Original Query: ${plan.originalQuery}
      
      Reasoning Steps:
      ${inputs.map((input, i) => `Step ${i+1}: ${input.stepDescription}\nExplanation: ${input.stepExplanation}\nResult: ${JSON.stringify(input.stepResult)}`).join('\n\n')}
      
      Please provide a clear, concise answer that directly addresses the original query.
      Include supporting evidence from the reasoning steps.
      If there are limitations or uncertainties in your answer, acknowledge them.
      
      Structure your response in a conversational, helpful tone that a non-technical user can understand.
      Include a section at the end that explains your reasoning process in simple terms.
      `;
      
      const synthesisResult = await OpenAIService.processQuery(synthesisPrompt);
      
      return {
        answer: synthesisResult.text,
        confidence: plan.confidence,
        reasoningProcess: inputs.map(input => ({
          description: input.stepDescription,
          explanation: input.stepExplanation,
          summary: this.summarizeResult(input.stepResult)
        })),
        supportingEvidence: inputs.map(input => ({
          description: input.stepDescription,
          summary: this.summarizeResult(input.stepResult)
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
    const startTime = Date.now();
    
    try {
      // Get data from previous steps if needed
      const inputData = {};
      
      if (step.parameters.dataSource === 'previous_step' && step.parameters.stepId) {
        const previousStep = previousResults.find(r => r.stepId === step.parameters.stepId);
        if (previousStep) {
          inputData.previousStepData = previousStep.result;
        }
      }
      
      // Extend with context data if available
      if (step.parameters.contextKeys && Array.isArray(step.parameters.contextKeys)) {
        for (const key of step.parameters.contextKeys) {
          if (context[key]) {
            inputData[key] = context[key];
          }
        }
      }
      
      // Use OpenAI to perform the calculation
      const calculationPrompt = `
      Perform the following calculation step:
      
      Step description: ${step.description}
      Input data: ${JSON.stringify(inputData)}
      
      Calculation instructions: ${step.parameters.instructions || 'Perform the calculation described in the step description'}
      
      Return a JSON object with your calculation result and an explanation of your approach.
      `;
      
      const calculationResult = await OpenAIService.processQuery(calculationPrompt);
      
      // Try to parse the result as JSON
      let result;
      try {
        result = JSON.parse(calculationResult.text);
      } catch (parseError) {
        // If not valid JSON, use the text response
        result = { 
          calculationResult: calculationResult.text,
          structured: false
        };
      }
      
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
      // Determine the text to extract parameters from
      const textToProcess = step.parameters.text || context.originalQuery || '';
      
      // Use OpenAI to extract parameters from the text
      const extractionResult = await OpenAIService.extractParameters(textToProcess);
      
      const endTime = Date.now();
      
      if (extractionResult.error) {
        return {
          success: false,
          error: `Parameter extraction failed: ${extractionResult.error}`,
          partialResult: extractionResult.parameters || {},
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
    const startTime = Date.now();
    
    try {
      // Extract data source and parameters
      const { dataSource, filters, limit, fields } = step.parameters;
      
      // This would need to connect to actual data services in your application
      // For now, we'll implement a placeholder
      
      let result;
      
      // For demonstration, return mock data based on the requested data source
      switch (dataSource) {
        case 'airports':
          result = { data: [
            { id: 1, name: 'Example Airport 1', code: 'EX1' },
            { id: 2, name: 'Example Airport 2', code: 'EX2' }
          ]};
          break;
        case 'flights':
          result = { data: [
            { id: 101, flightNumber: 'AA123', departureTime: '2023-10-15T08:30:00Z' },
            { id: 102, flightNumber: 'BA456', departureTime: '2023-10-15T09:45:00Z' }
          ]};
          break;
        case 'maintenance':
          result = { data: [
            { id: 201, standId: 'A1', startDate: '2023-10-20', endDate: '2023-10-25' },
            { id: 202, standId: 'B3', startDate: '2023-11-05', endDate: '2023-11-10' }
          ]};
          break;
        case 'capacity':
          result = { data: {
            hourlyCapacity: 42,
            totalStands: 25,
            availableStands: 18
          }};
          break;
        default:
          result = { data: "No data available for this source" };
      }
      
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
      
      if (!dataToValidate) {
        throw new Error('No data available for validation');
      }
      
      // For simplicity, we'll use OpenAI to validate the data
      const validationPrompt = `
      Validate the following data:
      
      Validation criteria: ${step.parameters.validationCriteria || step.description}
      
      Data: ${JSON.stringify(dataToValidate)}
      
      Return a JSON object with:
      - isValid: A boolean indicating whether the data is valid
      - errors: An array of error messages if not valid
      - validatedData: The validated data
      `;
      
      const validationResponse = await OpenAIService.processQuery(validationPrompt);
      
      // Try to parse the response
      let validationResult;
      try {
        validationResult = JSON.parse(validationResponse.text);
      } catch (parseError) {
        // Default structure if parsing fails
        validationResult = {
          isValid: false,
          errors: ['Failed to parse validation result'],
          validatedData: null
        };
      }
      
      const endTime = Date.now();
      
      return {
        success: validationResult.isValid,
        result: {
          isValid: validationResult.isValid,
          errors: validationResult.errors || [],
          validatedData: validationResult.isValid ? validationResult.validatedData || dataToValidate : null
        },
        error: validationResult.isValid ? null : `Validation failed: ${(validationResult.errors || []).join(', ')}`,
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
  
  /**
   * Execute a comparison step
   * @param {Object} step - Step definition
   * @param {Object} context - Global context
   * @param {Array} previousResults - Results from previous steps
   * @returns {Promise<Object>} - Comparison result
   */
  async executeComparisonStep(step, context, previousResults) {
    const startTime = Date.now();
    
    try {
      // Get data to compare from previous steps
      const items = [];
      
      if (step.parameters.itemIds && Array.isArray(step.parameters.itemIds)) {
        for (const itemId of step.parameters.itemIds) {
          const item = previousResults.find(r => r.stepId === itemId)?.result;
          if (item) {
            items.push(item);
          }
        }
      }
      
      if (items.length < 2) {
        throw new Error('Need at least two items to compare');
      }
      
      // For simplicity, we'll use OpenAI to compare the items
      const comparisonPrompt = `
      Compare the following items:
      
      Comparison criteria: ${step.parameters.criteria || step.description}
      
      Items:
      ${items.map((item, i) => `Item ${i+1}: ${JSON.stringify(item)}`).join('\n\n')}
      
      Return a JSON object with:
      - differences: Key differences between the items
      - similarities: Key similarities between the items
      - recommendation: Recommended item based on the comparison criteria
      `;
      
      const comparisonResponse = await OpenAIService.processQuery(comparisonPrompt);
      
      // Try to parse the response
      let comparisonResult;
      try {
        comparisonResult = JSON.parse(comparisonResponse.text);
      } catch (parseError) {
        // Default structure if parsing fails
        comparisonResult = {
          differences: comparisonResponse.text,
          similarities: [],
          recommendation: null
        };
      }
      
      const endTime = Date.now();
      
      return {
        success: true,
        result: comparisonResult,
        executionTime: (endTime - startTime) / 1000
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        error: `Comparison error: ${error.message}`,
        executionTime: (endTime - startTime) / 1000
      };
    }
  }
  
  /**
   * Execute a recommendation step
   * @param {Object} step - Step definition
   * @param {Object} context - Global context
   * @param {Array} previousResults - Results from previous steps
   * @returns {Promise<Object>} - Recommendation result
   */
  async executeRecommendationStep(step, context, previousResults) {
    const startTime = Date.now();
    
    try {
      // Get data from previous steps
      const inputData = {};
      
      if (step.parameters.dataStepIds && Array.isArray(step.parameters.dataStepIds)) {
        for (const stepId of step.parameters.dataStepIds) {
          const previousStep = previousResults.find(r => r.stepId === stepId);
          if (previousStep) {
            inputData[stepId] = previousStep.result;
          }
        }
      }
      
      // Use OpenAI to generate recommendations
      const recommendationPrompt = `
      Generate recommendations based on the following data:
      
      Recommendation task: ${step.description}
      Parameters: ${JSON.stringify(step.parameters)}
      
      Input data: ${JSON.stringify(inputData)}
      
      Return a JSON object with:
      - recommendations: An array of recommendation objects
      - rationale: Rationale for each recommendation
      - confidence: Confidence level for the recommendations
      `;
      
      const recommendationResponse = await OpenAIService.processQuery(recommendationPrompt);
      
      // Try to parse the response
      let recommendationResult;
      try {
        recommendationResult = JSON.parse(recommendationResponse.text);
      } catch (parseError) {
        // Default structure if parsing fails
        recommendationResult = {
          recommendations: [recommendationResponse.text],
          rationale: "See recommendation text",
          confidence: 0.5
        };
      }
      
      const endTime = Date.now();
      
      return {
        success: true,
        result: recommendationResult,
        executionTime: (endTime - startTime) / 1000
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        error: `Recommendation error: ${error.message}`,
        executionTime: (endTime - startTime) / 1000
      };
    }
  }
  
  // Helper methods
  
  /**
   * Generate a unique ID for a query
   * @returns {string} - Unique ID
   */
  generateUniqueId() {
    return `query-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  
  /**
   * Determine the type of a step based on its description
   * @param {Object} step - The step object
   * @returns {string} - Step type
   */
  determineStepType(step) {
    // Determine step type based on description and parameters
    if (step.type) return step.type;
    
    const desc = step.description.toLowerCase();
    if (desc.includes('calculat') || desc.includes('comput')) return 'calculation';
    if (desc.includes('extract') || desc.includes('identif')) return 'parameter_extraction';
    if (desc.includes('retriev') || desc.includes('fetch') || desc.includes('get')) return 'data_retrieval';
    if (desc.includes('validat') || desc.includes('verify') || desc.includes('check')) return 'validation';
    if (desc.includes('compar') || desc.includes('contrast')) return 'comparison';
    if (desc.includes('recommend') || desc.includes('suggest')) return 'recommendation';
    
    return 'generic';
  }
  
  /**
   * Estimate execution time for a step
   * @param {Object} step - The step object
   * @returns {number} - Estimated execution time in seconds
   */
  estimateExecutionTime(step) {
    // Rough estimate based on step type
    const stepType = this.determineStepType(step);
    switch (stepType) {
      case 'calculation': return 2.0; // seconds
      case 'parameter_extraction': return 3.5;
      case 'data_retrieval': return 1.5;
      case 'validation': return 0.5;
      case 'comparison': return 3.0;
      case 'recommendation': return 4.0;
      default: return 1.0;
    }
  }
  
  /**
   * Calculate total time for all steps
   * @param {Array} steps - Array of step objects
   * @returns {number} - Total estimated time in seconds
   */
  calculateTotalTime(steps) {
    return steps.reduce((total, step) => total + this.estimateExecutionTime(step), 0);
  }
  
  /**
   * Detect cycles in a dependency graph
   * @param {Object} graph - The dependency graph
   * @returns {boolean} - Whether a cycle was detected
   */
  detectCycle(graph) {
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
  
  /**
   * Check if a parameter can be resolved from context
   * @param {string} paramKey - The parameter key
   * @param {Object} context - The context object
   * @returns {boolean} - Whether the parameter can be resolved
   */
  canBeResolvedFromContext(paramKey, context) {
    return context.hasOwnProperty(paramKey) || 
           (context.parameters && context.parameters.hasOwnProperty(paramKey));
  }
  
  /**
   * Summarize a result object for inclusion in final answer
   * @param {*} result - The result to summarize
   * @returns {string} - Summarized result
   */
  summarizeResult(result) {
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
}

module.exports = MultiStepReasoningService;