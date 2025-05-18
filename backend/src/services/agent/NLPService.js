/**
 * Natural Language Processing Service
 * 
 * This service provides NLP capabilities for processing user commands, 
 * extracting intent and entities, and converting natural language into
 * structured data for the AirportAI system.
 */

const openaiService = require('./OpenAIService');
const logger = require('../../utils/logger');
const { performance } = require('perf_hooks');
const db = require('../../utils/db');
const airlineService = require('../AirlineService');
const airportService = require('../AirportService');

/**
 * Service for natural language processing functionality
 */
class NLPService {
  constructor() {
    // Define common intents for airport capacity planning
    this.intents = {
      CAPACITY_QUERY: 'capacity_query',
      MAINTENANCE_QUERY: 'maintenance_query',
      INFRASTRUCTURE_QUERY: 'infrastructure_query',
      MAINTENANCE_CREATE: 'maintenance_create',
      MAINTENANCE_UPDATE: 'maintenance_update',
      STAND_STATUS_QUERY: 'stand_status_query',
      CAPACITY_PARAMETER_UPDATE: 'capacity_parameter_update',
      SCENARIO_CREATE: 'scenario_create',
      SCENARIO_MODIFY: 'scenario_modify',
      SCENARIO_COMPARE: 'scenario_compare',
      SCENARIO_QUERY: 'scenario_query',
      WHAT_IF_ANALYSIS: 'what_if_analysis',
      HELP_REQUEST: 'help_request',
      VISUALIZATION_COMMAND: 'visualization_command',
      CLARIFICATION_REQUEST: 'clarification_request',
      VOICE_CONTROL: 'voice_control',
      AUTONOMOUS_SETTING: 'autonomous_setting',
      DATA_EXPORT: 'data_export',
      UNKNOWN: 'unknown'
    };
    
    // Define common entity types
    this.entityTypes = {
      TERMINAL: 'terminal',
      STAND: 'stand',
      AIRCRAFT_TYPE: 'aircraft_type',
      TIME_PERIOD: 'time_period',
      AIRLINE: 'airline',
      FLIGHT_NUMBER: 'flight_number',
      STAND_TYPE: 'stand_type',
      SCENARIO_PARAMETER: 'scenario_parameter',
      SCENARIO_NAME: 'scenario_name',
      COMPARISON_METRIC: 'comparison_metric',
      DATE: 'date',
      TIME: 'time',
      DURATION: 'duration',
      QUANTITY: 'quantity',
      PERCENTAGE: 'percentage',
      LOCATION: 'location',
      PERSON: 'person',
      ORGANIZATION: 'organization',
      VISUALIZATION_TYPE: 'visualization_type',
      AUTONOMOUS_LEVEL: 'autonomous_level',
      DATA_FORMAT: 'data_format'
    };

    // Initialize entity cache
    this.entityCache = {
      terminals: null,
      stands: null,
      aircraftTypes: null,
      airlines: null,
      lastUpdated: null,
      ttl: 15 * 60 * 1000 // 15 minutes
    };
    
    // Initialize model configuration
    this.modelConfig = {
      defaultModel: 'gpt-4o',
      fallbackModel: 'gpt-3.5-turbo',
      intentConfidenceThreshold: 0.7,
      entityConfidenceThreshold: 0.6,
      timeout: 10000, // 10 seconds
      retries: 2,
      useFallbackAfterRetries: true
    };

    // Initialize performance metrics
    this.metrics = {
      totalProcessed: 0,
      successfulQueries: 0,
      failedQueries: 0,
      totalLatency: 0,
      queryCount: {}
    };

    // Load domain-specific vocabulary
    this.loadDomainVocabulary();
  }

  /**
   * Process a user query to extract intent and entities
   * @param {string} query - The user's query text
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processed intent and entities
   */
  async processQuery(query, options = {}) {
    const startTime = performance.now();
    const requestId = this._generateRequestId();
    
    try {
      logger.info(`Processing NLP query [${requestId}]: ${query}`);
      
      // Input validation
      if (!query || typeof query !== 'string') {
        throw new Error('Invalid query: Query must be a non-empty string');
      }
      
      // Prepare context for processing
      const context = await this._prepareProcessingContext(options);
      
      // Preprocess the query (normalize, clean, etc.)
      const preprocessedQuery = this._preprocessQuery(query);
      
      // Try pattern matching for simple intents first (for efficiency)
      const patternResult = this._matchPatterns(preprocessedQuery);
      if (patternResult.confidence > this.modelConfig.intentConfidenceThreshold) {
        logger.debug(`Pattern matched intent: ${patternResult.intent} with confidence ${patternResult.confidence}`);
        
        // Extract entities - even for pattern matched intents we still need to extract entities
        const entities = await this._extractEntities(preprocessedQuery, patternResult.intent, context);
        
        const result = {
          intent: patternResult.intent,
          confidence: patternResult.confidence,
          entities,
          originalQuery: query,
          preprocessedQuery,
          patternMatched: true,
          processingTime: performance.now() - startTime,
          requestId
        };
        
        this._updateMetrics(result);
        return result;
      }
      
      // If no pattern match with high confidence, use OpenAI
      let retries = 0;
      let result = null;
      let lastError = null;
      
      while (retries <= this.modelConfig.retries) {
        try {
          // Use fallback model after initial retries
          const useModel = (retries === this.modelConfig.retries && this.modelConfig.useFallbackAfterRetries) 
            ? this.modelConfig.fallbackModel 
            : this.modelConfig.defaultModel;
          
          // Extract intent and entities using OpenAI
          const openaiResult = await openaiService.extractIntentAndEntities(
            preprocessedQuery, 
            {
              model: useModel,
              context,
              timeout: this.modelConfig.timeout,
              includeReasoning: options.includeReasoning
            }
          );
          
          // Validate and normalize results
          result = this._validateAndNormalizeResult(openaiResult, query, preprocessedQuery, requestId, startTime);
          break;
        } catch (error) {
          lastError = error;
          retries++;
          logger.warn(`NLP Processing retry ${retries}/${this.modelConfig.retries}: ${error.message}`);
          
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
        }
      }
      
      // If still no result after retries, return an error result
      if (!result) {
        const errorResult = {
          intent: this.intents.UNKNOWN,
          confidence: 0,
          entities: {},
          originalQuery: query,
          preprocessedQuery,
          error: lastError.message,
          processingTime: performance.now() - startTime,
          requestId
        };
        
        this._updateMetrics(errorResult);
        return errorResult;
      }
      
      // Post-process results (validate entities, enhance with domain knowledge)
      const enhancedResult = await this._postProcessResult(result, context);
      
      // Track performance metrics
      this._updateMetrics(enhancedResult);
      
      return enhancedResult;
    } catch (error) {
      const processingTime = performance.now() - startTime;
      logger.error(`NLP Processing Error [${requestId}]: ${error.message}`, { 
        error: error.stack,
        query,
        processingTime 
      });
      
      // Update failure metrics
      this.metrics.totalProcessed++;
      this.metrics.failedQueries++;
      this.metrics.totalLatency += processingTime;
      
      return {
        intent: this.intents.UNKNOWN,
        confidence: 0,
        entities: {},
        originalQuery: query,
        preprocessedQuery: query,
        error: error.message,
        processingTime,
        requestId
      };
    }
  }

  /**
   * Extract parameters from natural language description
   * @param {string} prompt - The parameterization prompt
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} - Extracted parameters
   */
  async processParameterExtraction(prompt, options = {}) {
    const startTime = performance.now();
    const requestId = this._generateRequestId();
    
    try {
      logger.info(`Processing parameter extraction [${requestId}]`);
      
      // Input validation
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt: Prompt must be a non-empty string');
      }
      
      // Prepare schema for extraction if provided
      const schema = options.schema || {};
      
      // Use OpenAI for advanced parameter extraction
      const result = await openaiService.extractParameters(prompt, {
        model: options.model || this.modelConfig.defaultModel,
        schema,
        timeout: options.timeout || this.modelConfig.timeout
      });
      
      // Validate and normalize parameters
      const validatedParameters = this._validateParameters(result.parameters, schema);
      
      // Log and return the results
      logger.debug(`Extracted Parameters [${requestId}]: ${JSON.stringify(validatedParameters)}`);
      
      const processingTime = performance.now() - startTime;
      return {
        parameters: validatedParameters,
        confidence: result.confidence || 0,
        reasoning: result.reasoning || [],
        processingTime,
        requestId
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      logger.error(`Parameter Extraction Error [${requestId}]: ${error.message}`, { 
        error: error.stack,
        prompt,
        processingTime 
      });
      
      return {
        parameters: {},
        confidence: 0,
        error: error.message,
        processingTime,
        requestId
      };
    }
  }
  
  /**
   * Process multi-step reasoning for complex queries
   * @param {string} query - The complex query to reason about
   * @param {object} context - Additional context information
   * @param {object} options - Reasoning options
   * @returns {Promise<Object>} - Reasoning steps and result
   */
  async processMultiStepReasoning(query, context = {}, options = {}) {
    const startTime = performance.now();
    const requestId = this._generateRequestId();
    
    try {
      logger.info(`Processing multi-step reasoning [${requestId}] for: ${query}`);
      
      // Input validation
      if (!query || typeof query !== 'string') {
        throw new Error('Invalid query: Query must be a non-empty string');
      }
      
      // Enrich context with domain knowledge if needed
      const enrichedContext = await this._enrichContextForReasoning(context);
      
      // Use OpenAI for multi-step reasoning
      const result = await openaiService.performMultiStepReasoning(
        query, 
        enrichedContext,
        {
          model: options.model || this.modelConfig.defaultModel,
          maxSteps: options.maxSteps || 5,
          timeout: options.timeout || 30000, // 30s for complex reasoning
          requireExplanations: options.requireExplanations !== false
        }
      );
      
      // Validate reasoning result
      if (!result.finalAnswer || !result.steps || !Array.isArray(result.steps)) {
        throw new Error('Invalid reasoning result structure');
      }
      
      // Log the results
      logger.debug(`Reasoning Result [${requestId}]: ${JSON.stringify(result.finalAnswer)}`);
      logger.debug(`Reasoning Steps [${requestId}]: ${result.steps.length} steps completed`);
      
      const processingTime = performance.now() - startTime;
      return {
        steps: result.steps,
        finalAnswer: result.finalAnswer,
        confidence: result.confidence || 0,
        processingTime,
        requestId
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      logger.error(`Multi-step Reasoning Error [${requestId}]: ${error.message}`, { 
        error: error.stack,
        query,
        processingTime 
      });
      
      return {
        steps: [],
        finalAnswer: {},
        confidence: 0,
        error: error.message,
        processingTime,
        requestId
      };
    }
  }

  /**
   * Process time expressions to standardize date and time formats
   * @param {string} timeExpression - The time expression to process
   * @param {Object} options - Additional options for processing
   * @returns {Object} - Standardized time information
   */
  processTimeExpression(timeExpression, options = {}) {
    try {
      if (!timeExpression) return null;
      
      const now = options.referenceDate ? new Date(options.referenceDate) : new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // First check if we have a direct ISO format date/time
      if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(timeExpression)) {
        const date = new Date(timeExpression);
        if (!isNaN(date.getTime())) {
          // Handle date-only or date-time format
          const hasTime = timeExpression.includes('T');
          const endDate = new Date(date);
          
          if (!hasTime) {
            endDate.setHours(23, 59, 59, 999);
          } else {
            // For a specific time, we set the end time to the same time
          }
          
          return {
            type: hasTime ? 'datetime' : 'day',
            start: date,
            end: endDate,
            expression: timeExpression,
            iso: {
              start: date.toISOString(),
              end: endDate.toISOString()
            }
          };
        }
      }
      
      // Handle common time expressions using regex-based matching
      // Complete implementation from current NLPService.processTimeExpression
      
      // Extended functionality for more complex time expressions
      
      // Month expressions like "June 2023"
      const monthYearRegex = /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]+(\d{4})/i;
      const monthYearMatch = timeExpression.match(monthYearRegex);
      if (monthYearMatch) {
        const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const monthText = monthYearMatch[0].split(/[\s,]+/)[0].toLowerCase();
        const month = monthNames.findIndex(m => monthText.startsWith(m.substring(0, 3)));
        const year = parseInt(monthYearMatch[1], 10);
        
        if (month !== -1 && !isNaN(year)) {
          const startDate = new Date(year, month, 1);
          const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
          
          return {
            type: 'month',
            start: startDate,
            end: endDate,
            expression: timeExpression,
            iso: {
              start: startDate.toISOString(),
              end: endDate.toISOString()
            }
          };
        }
      }
      
      // Hour ranges like "between 9am and 5pm"
      const hourRangeRegex = /between\s+(\d{1,2})(?::\d{2})?\s*([ap]m?)\s+and\s+(\d{1,2})(?::\d{2})?\s*([ap]m?)/i;
      const hourRangeMatch = timeExpression.match(hourRangeRegex);
      if (hourRangeMatch) {
        const startHour = parseInt(hourRangeMatch[1], 10) + (hourRangeMatch[2].toLowerCase().startsWith('p') && hourRangeMatch[1] !== '12' ? 12 : 0);
        const endHour = parseInt(hourRangeMatch[3], 10) + (hourRangeMatch[4].toLowerCase().startsWith('p') && hourRangeMatch[3] !== '12' ? 12 : 0);
        
        const startDate = new Date(today);
        startDate.setHours(startHour, 0, 0, 0);
        
        const endDate = new Date(today);
        endDate.setHours(endHour, 59, 59, 999);
        
        return {
          type: 'time_range',
          start: startDate,
          end: endDate,
          expression: timeExpression,
          iso: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        };
      }
      
      // Handle time ranges like "next 7 days", "next 2 weeks", etc.
      const durationRegex = /next\s+(\d+)\s+(day|days|week|weeks|month|months)/i;
      const durationMatch = timeExpression.match(durationRegex);
      if (durationMatch) {
        const amount = parseInt(durationMatch[1], 10);
        const unit = durationMatch[2].toLowerCase();
        
        const startDate = new Date(today);
        const endDate = new Date(today);
        
        if (unit.startsWith('day')) {
          endDate.setDate(endDate.getDate() + amount);
        } else if (unit.startsWith('week')) {
          endDate.setDate(endDate.getDate() + amount * 7);
        } else if (unit.startsWith('month')) {
          endDate.setMonth(endDate.getMonth() + amount);
        }
        
        endDate.setHours(23, 59, 59, 999);
        
        return {
          type: `duration_${unit}`,
          start: startDate,
          end: endDate,
          expression: timeExpression,
          iso: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          duration: {
            amount,
            unit: unit.replace(/s$/, '') // normalize to singular
          }
        };
      }
      
      // For any expression not handled, try one last fallback approach using OpenAI
      // This would be an async call, but since this function is expected to be synchronous,
      // we'll just return a marker that the caller can use to know they need
      // to process this expression asynchronously if needed.
      if (options.allowAsyncFallback) {
        return {
          type: 'needs_async_processing',
          expression: timeExpression
        };
      }
      
      // Return unknown result
      return {
        type: 'unknown',
        expression: timeExpression
      };
    } catch (error) {
      logger.error(`Time Expression Processing Error: ${error.message}`, {
        timeExpression,
        error: error.stack
      });
      return {
        type: 'error',
        expression: timeExpression,
        error: error.message
      };
    }
  }
  
  /**
   * Process a time expression asynchronously using AI
   * @param {string} timeExpression - The time expression to process
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Standardized time information
   */
  async processTimeExpressionAsync(timeExpression, options = {}) {
    try {
      // Try synchronous processing first
      const syncResult = this.processTimeExpression(timeExpression, { ...options, allowAsyncFallback: false });
      
      // If we got a valid result, return it
      if (syncResult.type !== 'unknown' && syncResult.type !== 'error') {
        return syncResult;
      }
      
      // Otherwise use OpenAI for advanced time expression parsing
      const result = await openaiService.parseTimeExpression(timeExpression, {
        referenceDate: options.referenceDate,
        timezone: options.timezone || 'UTC'
      });
      
      // Convert the result to our standard format
      if (result.parsed) {
        return {
          type: result.type || 'datetime',
          start: new Date(result.start),
          end: new Date(result.end),
          expression: timeExpression,
          iso: {
            start: result.start,
            end: result.end
          },
          confidence: result.confidence
        };
      }
      
      // If OpenAI couldn't parse it either, return unknown
      return {
        type: 'unknown',
        expression: timeExpression
      };
    } catch (error) {
      logger.error(`Async Time Expression Processing Error: ${error.message}`, {
        timeExpression,
        error: error.stack
      });
      return {
        type: 'error',
        expression: timeExpression,
        error: error.message
      };
    }
  }
  
  /**
   * Map intents to API actions
   * @param {string} intent - The identified intent
   * @returns {Object} - API action information
   */
  mapIntentToAction(intent) {
    const intentMap = {
      [this.intents.CAPACITY_QUERY]: {
        service: 'capacityService',
        method: 'getCapacity',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.MAINTENANCE_QUERY]: {
        service: 'maintenanceService',
        method: 'getMaintenanceStatus',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.INFRASTRUCTURE_QUERY]: {
        service: 'infrastructureService',
        method: 'getInfrastructureInfo',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.MAINTENANCE_CREATE]: {
        service: 'maintenanceService',
        method: 'createMaintenanceRequest',
        requiresApproval: true,
        allowVoice: false,
        allowAutonomous: false
      },
      [this.intents.MAINTENANCE_UPDATE]: {
        service: 'maintenanceService',
        method: 'updateMaintenanceRequest',
        requiresApproval: true,
        allowVoice: false,
        allowAutonomous: false
      },
      [this.intents.STAND_STATUS_QUERY]: {
        service: 'standService',
        method: 'getStandStatus',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.CAPACITY_PARAMETER_UPDATE]: {
        service: 'capacityService',
        method: 'updateCapacityParameters',
        requiresApproval: true,
        allowVoice: false,
        allowAutonomous: false
      },
      [this.intents.SCENARIO_CREATE]: {
        service: 'scenarioService',
        method: 'createScenario',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.SCENARIO_MODIFY]: {
        service: 'scenarioService',
        method: 'updateScenario',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.SCENARIO_COMPARE]: {
        service: 'scenarioService',
        method: 'compareScenarios',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.SCENARIO_QUERY]: {
        service: 'scenarioService',
        method: 'getScenarioDetails',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.WHAT_IF_ANALYSIS]: {
        service: 'scenarioService',
        method: 'createFromDescription',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.HELP_REQUEST]: {
        service: 'helpService',
        method: 'getHelpContent',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.VISUALIZATION_COMMAND]: {
        service: 'visualizationService',
        method: 'executeVisualizationCommand',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.CLARIFICATION_REQUEST]: {
        service: 'dialogService',
        method: 'handleClarification',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      },
      [this.intents.VOICE_CONTROL]: {
        service: 'voiceInterfaceService',
        method: 'handleVoiceControl',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: false
      },
      [this.intents.AUTONOMOUS_SETTING]: {
        service: 'autonomousOperationsService',
        method: 'updateSettings',
        requiresApproval: true,
        allowVoice: false,
        allowAutonomous: false
      },
      [this.intents.DATA_EXPORT]: {
        service: 'dataExportService',
        method: 'exportData',
        requiresApproval: false,
        allowVoice: true,
        allowAutonomous: true
      }
    };
    
    return intentMap[intent] || {
      service: null,
      method: null,
      requiresApproval: false,
      allowVoice: false,
      allowAutonomous: false
    };
  }
  
  /**
   * Generate a natural language response based on intent, entities, and action results
   * @param {Object} input - Input parameters for response generation
   * @returns {Promise<Object>} - Generated response
   */
  async generateResponse(input) {
    try {
      const { intent, entities, actionResult, options = {} } = input;
      
      if (!intent) {
        throw new Error('Intent is required for response generation');
      }
      
      // Use different response types based on requested format
      const responseType = options.responseType || 'text';
      
      // Generate response using OpenAI
      const response = await openaiService.generateResponse({
        intent,
        entities,
        actionResult,
        responseType,
        tone: options.tone || 'professional',
        length: options.length || 'medium',
        userPreferences: options.userPreferences
      });
      
      return {
        responseText: response.text,
        responseSpeech: response.speech,
        suggestedActions: response.suggestedActions || [],
        responseType
      };
    } catch (error) {
      logger.error(`Response Generation Error: ${error.message}`, { error: error.stack });
      
      // Fallback to a generic response based on intent
      const fallbackResponses = {
        [this.intents.CAPACITY_QUERY]: "Here is the capacity information you requested.",
        [this.intents.MAINTENANCE_QUERY]: "Here is the maintenance information you requested.",
        [this.intents.UNKNOWN]: "I'm sorry, I couldn't process that request."
      };
      
      return {
        responseText: fallbackResponses[input.intent] || fallbackResponses[this.intents.UNKNOWN],
        responseSpeech: fallbackResponses[input.intent] || fallbackResponses[this.intents.UNKNOWN],
        suggestedActions: [],
        responseType: 'text',
        isErrorFallback: true
      };
    }
  }
  
  /**
   * Identify entity relationships in text
   * @param {string} text - The text to analyze
   * @param {Array<Object>} entities - Extracted entities
   * @returns {Promise<Object>} - Entity relationship map
   */
  async identifyEntityRelationships(text, entities) {
    try {
      logger.info(`Identifying entity relationships in text`);
      
      // Use OpenAI for entity relationship mapping
      const result = await openaiService.extractEntityRelationships(text, entities);
      
      // Log the results
      logger.debug(`Entity Relationships: ${JSON.stringify(result.relationships)}`);
      
      return {
        relationships: result.relationships || {},
        confidence: result.confidence || 0
      };
    } catch (error) {
      logger.error(`Entity Relationship Error: ${error.message}`, { error: error.stack });
      return {
        relationships: {},
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Get performance metrics for the NLP service
   * @returns {Object} - Service metrics
   */
  getMetrics() {
    const avgLatency = this.metrics.totalProcessed > 0 
      ? this.metrics.totalLatency / this.metrics.totalProcessed 
      : 0;
    
    const successRate = this.metrics.totalProcessed > 0 
      ? (this.metrics.successfulQueries / this.metrics.totalProcessed) * 100 
      : 0;
    
    // Get top 5 intents by frequency
    const sortedIntents = Object.entries(this.metrics.queryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([intent, count]) => ({ intent, count }));
    
    return {
      totalProcessed: this.metrics.totalProcessed,
      successfulQueries: this.metrics.successfulQueries,
      failedQueries: this.metrics.failedQueries,
      avgLatencyMs: avgLatency,
      successRate,
      topIntents: sortedIntents,
      uptime: process.uptime()
    };
  }
  
  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      totalProcessed: 0,
      successfulQueries: 0,
      failedQueries: 0,
      totalLatency: 0,
      queryCount: {}
    };
    
    logger.info('NLP Service metrics have been reset');
  }

  /**
   * Update service configuration
   * @param {Object} config - New configuration values
   */
  updateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration object');
    }
    
    // Update model configuration with provided values
    if (config.defaultModel) this.modelConfig.defaultModel = config.defaultModel;
    if (config.fallbackModel) this.modelConfig.fallbackModel = config.fallbackModel;
    if (config.intentConfidenceThreshold) this.modelConfig.intentConfidenceThreshold = config.intentConfidenceThreshold;
    if (config.entityConfidenceThreshold) this.modelConfig.entityConfidenceThreshold = config.entityConfidenceThreshold;
    if (config.timeout) this.modelConfig.timeout = config.timeout;
    if (config.retries !== undefined) this.modelConfig.retries = config.retries;
    if (config.useFallbackAfterRetries !== undefined) this.modelConfig.useFallbackAfterRetries = config.useFallbackAfterRetries;
    
    // Update entity cache TTL if provided
    if (config.entityCacheTTL) this.entityCache.ttl = config.entityCacheTTL;
    
    logger.info('NLP Service configuration updated', { newConfig: this.modelConfig });
  }
  
  /**
   * Clear entity cache and force reload
   */
  async refreshEntityCache() {
    this.entityCache = {
      terminals: null,
      stands: null,
      aircraftTypes: null,
      airlines: null,
      lastUpdated: null,
      ttl: this.entityCache.ttl
    };
    
    await this._loadEntityCacheData();
    logger.info('Entity cache has been refreshed');
  }

  /* -------------------------
   * Private helper methods
   * ------------------------- */
   
  /**
   * Preprocess query (normalize, clean, etc.)
   * @private
   * @param {string} query - Original query
   * @returns {string} - Preprocessed query
   */
  _preprocessQuery(query) {
    // Remove extra whitespace
    let processed = query.trim().replace(/\s+/g, ' ');
    
    // Convert to lowercase for pattern matching
    processed = processed.toLowerCase();
    
    // Remove punctuation that doesn't affect meaning
    processed = processed.replace(/[.,;:\-?!]+\s/g, ' ');
    
    return processed;
  }
  
  /**
   * Generate a unique request ID
   * @private
   * @returns {string} - Unique request ID
   */
  _generateRequestId() {
    return `nlp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
  
  /**
   * Attempt to match query against known patterns
   * @private
   * @param {string} query - Preprocessed query
   * @returns {Object} - Pattern matching result
   */
  _matchPatterns(query) {
    // Patterns for common intents - these are more efficient than using the LLM
    const patterns = [
      {
        intent: this.intents.HELP_REQUEST,
        patterns: [
          /^help( me)?$/,
          /^(what can you|what do you|how do you) do/,
          /^show me (what you can|how to|commands)/,
          /^(list|show) (commands|functions|capabilities)/
        ],
        confidence: 0.95
      },
      {
        intent: this.intents.CAPACITY_QUERY,
        patterns: [
          /^(show|display|get|what is) (the )?capacity( of| for)?/,
          /^capacity (of|for|at|in)/,
          /^how (many|much) capacity/,
          /^what is the (current|available) capacity/
        ],
        confidence: 0.85
      },
      {
        intent: this.intents.MAINTENANCE_QUERY,
        patterns: [
          /^(show|display|get|list|what) (is |are )?(the )?(current |ongoing |scheduled |planned )?(maintenance|work|repairs)/,
          /^maintenance (status|schedule|plan|overview|report)/,
          /^when is (the )?(next|upcoming) maintenance/
        ],
        confidence: 0.85
      },
      {
        intent: this.intents.STAND_STATUS_QUERY,
        patterns: [
          /^(show|display|get|what is) (the )?(status|availability)( of| for)? (stand|gate)/,
          /^(is|are) (stand|gate) [a-z0-9\-]+ (available|occupied|open|closed)/,
          /^which stands are (available|occupied|open|closed)/
        ],
        confidence: 0.85
      },
      {
        intent: this.intents.VISUALIZATION_COMMAND,
        patterns: [
          /^(show|display|visualize|draw|plot|graph|chart)/,
          /^(create|generate|make) a (chart|graph|visualization|plot|dashboard)/
        ],
        confidence: 0.8
      }
    ];
    
    // Check each pattern group
    for (const group of patterns) {
      for (const pattern of group.patterns) {
        if (pattern.test(query)) {
          return {
            intent: group.intent,
            confidence: group.confidence,
            patternMatched: true
          };
        }
      }
    }
    
    // No pattern match
    return {
      intent: this.intents.UNKNOWN,
      confidence: 0,
      patternMatched: false
    };
  }
  
  /**
   * Extract entities from a query
   * @private
   * @param {string} query - Preprocessed query
   * @param {string} intent - Detected intent
   * @param {Object} context - Processing context
   * @returns {Promise<Object>} - Extracted entities
   */
  async _extractEntities(query, intent, context) {
    // Make sure entity cache is loaded
    await this._loadEntityCacheData();
    
    // Extract entities using OpenAI
    const result = await openaiService.extractEntities(query, {
      intent,
      context: {
        ...context,
        entityLists: {
          terminals: this.entityCache.terminals || [],
          stands: this.entityCache.stands || [],
          aircraftTypes: this.entityCache.aircraftTypes || [],
          airlines: this.entityCache.airlines || []
        }
      }
    });
    
    // Post-process entities
    const processedEntities = {};
    
    // Validate and normalize each entity
    for (const [key, value] of Object.entries(result.entities || {})) {
      const normalizedValue = this._normalizeEntity(key, value);
      if (normalizedValue !== null) {
        processedEntities[key] = normalizedValue;
      }
    }
    
    return processedEntities;
  }
  
  /**
   * Normalize entity values based on type
   * @private
   * @param {string} entityType - Type of entity
   * @param {any} value - Raw entity value
   * @returns {any} - Normalized entity value
   */
  _normalizeEntity(entityType, value) {
    if (value === null || value === undefined) return null;
    
    switch (entityType) {
      case this.entityTypes.TERMINAL:
        // Normalize terminal references
        if (typeof value === 'string') {
          const terminalMatch = value.match(/(?:terminal|term)[.\s-]*(\d+|[a-z])/i);
          if (terminalMatch) {
            return `T${terminalMatch[1].toUpperCase()}`;
          }
        }
        return value;
        
      case this.entityTypes.STAND:
        // Normalize stand references
        if (typeof value === 'string') {
          const standMatch = value.match(/(?:stand|gate)[.\s-]*([a-z]?\d+[a-z]?)/i);
          if (standMatch) {
            return standMatch[1].toUpperCase();
          }
        }
        return value;
        
      case this.entityTypes.DATE:
      case this.entityTypes.TIME_PERIOD:
        // Use time expression processor
        if (typeof value === 'string') {
          const timeResult = this.processTimeExpression(value);
          if (timeResult.type !== 'unknown' && timeResult.type !== 'error') {
            return timeResult;
          }
        }
        return value;
        
      case this.entityTypes.PERCENTAGE:
        // Normalize percentage values
        if (typeof value === 'string') {
          const percentMatch = value.match(/(\d+(\.\d+)?)%?/);
          if (percentMatch) {
            return parseFloat(percentMatch[1]) / 100;
          }
        } else if (typeof value === 'number') {
          return value > 1 ? value / 100 : value;
        }
        return value;
        
      default:
        return value;
    }
  }
  
  /**
   * Validate and normalize OpenAI result
   * @private
   * @param {Object} result - Raw result from OpenAI
   * @param {string} originalQuery - Original query
   * @param {string} preprocessedQuery - Preprocessed query
   * @param {string} requestId - Request ID
   * @param {number} startTime - Start time of processing
   * @returns {Object} - Validated and normalized result
   */
  _validateAndNormalizeResult(result, originalQuery, preprocessedQuery, requestId, startTime) {
    if (!result || !result.intent) {
      throw new Error('Invalid result structure from intent extraction');
    }
    
    // Normalize confidence score
    const confidence = typeof result.confidence === 'number' 
      ? result.confidence 
      : 0.7; // Default confidence
    
    return {
      intent: result.intent,
      confidence,
      entities: result.entities || {},
      reasoning: result.reasoning,
      originalQuery,
      preprocessedQuery,
      processingTime: performance.now() - startTime,
      requestId
    };
  }
  
  /**
   * Prepare context for NLP processing
   * @private
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Prepared context
   */
  async _prepareProcessingContext(options) {
    // Start with user-provided context
    const context = { ...options.context };
    
    // Add standard context information
    context.processingTime = new Date().toISOString();
    context.userRole = options.userRole || 'user';
    
    // Add conversation context if available
    if (options.conversationId) {
      // Would retrieve conversation history in production
      context.conversationId = options.conversationId;
    }
    
    return context;
  }
  
  /**
   * Post-process and enhance NLP results
   * @private
   * @param {Object} result - Raw result
   * @param {Object} context - Processing context
   * @returns {Promise<Object>} - Enhanced result
   */
  async _postProcessResult(result, context) {
    // Map to standard intent if needed
    if (!Object.values(this.intents).includes(result.intent)) {
      // Find closest matching intent
      const matchedIntent = this._findClosestIntent(result.intent);
      
      if (matchedIntent !== this.intents.UNKNOWN) {
        result.originalIntent = result.intent;
        result.intent = matchedIntent;
      }
    }
    
    // Add action mapping
    result.action = this.mapIntentToAction(result.intent);
    
    // Add voice support flag
    result.supportsVoice = result.action?.allowVoice || false;
    
    return result;
  }
  
  /**
   * Find the closest matching intent
   * @private
   * @param {string} intent - Intent to match
   * @returns {string} - Matched intent or UNKNOWN
   */
  _findClosestIntent(intent) {
    const intentLower = intent.toLowerCase();
    
    // Direct substring matches
    for (const [key, value] of Object.entries(this.intents)) {
      if (intentLower.includes(value.toLowerCase())) {
        return value;
      }
    }
    
    // Pattern-based matching for common variations
    if (intentLower.includes('capacity') && intentLower.includes('query')) {
      return this.intents.CAPACITY_QUERY;
    }
    
    if (intentLower.includes('maintenance') && intentLower.includes('query')) {
      return this.intents.MAINTENANCE_QUERY;
    }
    
    if (intentLower.includes('stand') && intentLower.includes('status')) {
      return this.intents.STAND_STATUS_QUERY;
    }
    
    if (intentLower.includes('help')) {
      return this.intents.HELP_REQUEST;
    }
    
    // No match found
    return this.intents.UNKNOWN;
  }
  
  /**
   * Load domain-specific vocabulary
   * @private
   */
  async loadDomainVocabulary() {
    try {
      // This would be more sophisticated in production, loading from a database or dictionary files
      this.vocabulary = {
        airports: ['LHR', 'LGW', 'MAN', 'EDI', 'GLA', 'BHX'],
        terminals: ['T1', 'T2', 'T3', 'T4', 'T5'],
        standTypes: ['contact', 'remote', 'cargo', 'widebody', 'narrowbody'],
        airlines: ['BA', 'EZY', 'RYR', 'LH', 'AF', 'KLM', 'DL', 'AA', 'UA', 'QR'],
        timeUnits: ['minute', 'hour', 'day', 'week', 'month', 'year'],
        capacityMetrics: ['utilization', 'availability', 'occupancy', 'efficiency'],
        visualizationTypes: ['chart', 'graph', 'map', 'table', 'gantt', 'dashboard']
      };
      
      logger.debug('Domain vocabulary loaded');
    } catch (error) {
      logger.error(`Error loading domain vocabulary: ${error.message}`);
      // Initialize with empty vocabulary
      this.vocabulary = {};
    }
  }
  
  /**
   * Load entity data for cache
   * @private
   * @returns {Promise<void>}
   */
  async _loadEntityCacheData() {
    try {
      // Check if cache is stale
      const now = Date.now();
      if (
        this.entityCache.lastUpdated &&
        now - this.entityCache.lastUpdated < this.entityCache.ttl &&
        this.entityCache.terminals && 
        this.entityCache.stands && 
        this.entityCache.aircraftTypes && 
        this.entityCache.airlines
      ) {
        // Cache is still valid
        return;
      }
      
      // Load terminals
      const terminals = await db('terminals').select('id', 'name', 'code');
      this.entityCache.terminals = terminals.map(t => ({
        id: t.id,
        name: t.name,
        code: t.code
      }));
      
      // Load stands
      const stands = await db('stands').select('id', 'name', 'terminal_id');
      this.entityCache.stands = stands.map(s => ({
        id: s.id,
        name: s.name,
        terminalId: s.terminal_id
      }));
      
      // Load aircraft types
      const aircraftTypes = await db('aircraft_types').select('id', 'iata_code', 'icao_code', 'name');
      this.entityCache.aircraftTypes = aircraftTypes.map(a => ({
        id: a.id,
        iataCode: a.iata_code,
        icaoCode: a.icao_code,
        name: a.name
      }));
      
      // Load airlines
      const airlines = await airlineService.getAllAirlines();
      this.entityCache.airlines = airlines.map(a => ({
        id: a.id,
        name: a.name,
        iataCode: a.iata_code,
        icaoCode: a.icao_code
      }));
      
      // Update last updated timestamp
      this.entityCache.lastUpdated = now;
      
      logger.debug('Entity cache data loaded successfully');
    } catch (error) {
      logger.error(`Error loading entity cache data: ${error.message}`, { error: error.stack });
      // Keep using existing cache if available, even if stale
    }
  }
  
  /**
   * Validate extracted parameters against schema
   * @private
   * @param {Object} parameters - Extracted parameters
   * @param {Object} schema - Parameter schema
   * @returns {Object} - Validated parameters
   */
  _validateParameters(parameters, schema) {
    if (!parameters) return {};
    if (!schema || Object.keys(schema).length === 0) return parameters;
    
    const validatedParams = {};
    
    // Validate each parameter against schema
    for (const [key, value] of Object.entries(parameters)) {
      const paramSchema = schema[key];
      
      // Skip validation if no schema for this parameter
      if (!paramSchema) {
        validatedParams[key] = value;
        continue;
      }
      
      // Validate type
      if (paramSchema.type && typeof value !== paramSchema.type) {
        // Try to convert if possible
        switch (paramSchema.type) {
          case 'number':
            const num = Number(value);
            if (!isNaN(num)) {
              validatedParams[key] = num;
            }
            break;
          case 'boolean':
            if (typeof value === 'string') {
              if (value.toLowerCase() === 'true') validatedParams[key] = true;
              else if (value.toLowerCase() === 'false') validatedParams[key] = false;
            }
            break;
          case 'string':
            validatedParams[key] = String(value);
            break;
          default:
            // Skip this parameter if can't convert
            logger.warn(`Parameter ${key} has invalid type: expected ${paramSchema.type}, got ${typeof value}`);
        }
        continue;
      }
      
      // Check enum values
      if (paramSchema.enum && !paramSchema.enum.includes(value)) {
        logger.warn(`Parameter ${key} has invalid value: expected one of ${paramSchema.enum.join(', ')}, got ${value}`);
        continue;
      }
      
      // All validation passed
      validatedParams[key] = value;
    }
    
    return validatedParams;
  }
  
  /**
   * Enrich context with domain knowledge for reasoning
   * @private
   * @param {Object} context - Base context
   * @returns {Promise<Object>} - Enriched context
   */
  async _enrichContextForReasoning(context) {
    const enriched = { ...context };
    
    if (!enriched.domainKnowledge) {
      enriched.domainKnowledge = {};
    }
    
    // Add airport information if not present
    if (!enriched.domainKnowledge.airport) {
      try {
        const airport = await airportService.getAirportById(context.airportId || 1);
        enriched.domainKnowledge.airport = {
          name: airport.name,
          iataCode: airport.iata_code,
          terminalCount: airport.terminals?.length || 0
        };
      } catch (error) {
        logger.warn(`Error fetching airport information for reasoning: ${error.message}`);
      }
    }
    
    return enriched;
  }
  
  /**
   * Update performance metrics with processing result
   * @private
   * @param {Object} result - Processing result
   */
  _updateMetrics(result) {
    this.metrics.totalProcessed++;
    this.metrics.totalLatency += result.processingTime || 0;
    
    if (result.error) {
      this.metrics.failedQueries++;
    } else {
      this.metrics.successfulQueries++;
      
      // Track intent counts
      if (result.intent) {
        this.metrics.queryCount[result.intent] = (this.metrics.queryCount[result.intent] || 0) + 1;
      }
    }
  }
}

// Export a singleton instance
module.exports = new NLPService();