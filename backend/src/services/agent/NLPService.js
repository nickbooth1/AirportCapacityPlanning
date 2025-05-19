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
          /^(list|show) (commands|functions|capabilities)/,
          /^i need help( with)?/,
          /^guide me/
        ],
        confidence: 0.95
      },
      {
        intent: this.intents.CAPACITY_QUERY,
        patterns: [
          /^(show|display|get|what is) (the )?capacity( of| for)?/,
          /^capacity (of|for|at|in)/,
          /^how (many|much) capacity/,
          /^what is the (current|available) capacity/,
          /^how many (aircraft|planes|flights) can/,
          /^(tell|show) me (about )?(stand|terminal|airport) capacity/,
          /^what's the (maximum|total|peak) capacity/
        ],
        confidence: 0.85
      },
      {
        intent: this.intents.MAINTENANCE_QUERY,
        patterns: [
          /^(show|display|get|list|what) (is |are )?(the )?(current |ongoing |scheduled |planned )?(maintenance|work|repairs)/,
          /^maintenance (status|schedule|plan|overview|report)/,
          /^when is (the )?(next|upcoming) maintenance/,
          /^(are|is) (there|any) (maintenance|repairs|work) (scheduled|planned|happening|ongoing)/,
          /^(which|what) (stands|gates|terminals) (are|have) (closed|under|scheduled) (for )?(maintenance|repair|work)/,
          /^maintenance (impact|effect) on (capacity|operations)/
        ],
        confidence: 0.85
      },
      {
        intent: this.intents.STAND_STATUS_QUERY,
        patterns: [
          /^(show|display|get|what is) (the )?(status|availability)( of| for)? (stand|gate)/,
          /^(is|are) (stand|gate) [a-z0-9\-]+ (available|occupied|open|closed)/,
          /^which stands are (available|occupied|open|closed)/,
          /^(tell|show) me (about|which) (stands|gates) (are|can) (available|occupied|open|closed)/,
          /^can (aircraft|plane|flight) [a-z0-9\-]+ (use|park at|be allocated to) (stand|gate)/,
          /^(stands|gates) (status|availability) (now|today|this week|this month)/,
          /^(list|show) all (stands|gates) (for|at) (terminal|pier) [a-z0-9\-]+/
        ],
        confidence: 0.85
      },
      {
        intent: this.intents.INFRASTRUCTURE_QUERY,
        patterns: [
          /^(show|tell|list) (me )?(about |information )?(the |our )?(airport|terminal|pier) (infrastructure|layout|setup)/,
          /^how many (stands|gates|terminals|piers) (do we have|are there|exist)/,
          /^what (stands|gates) are (in|at) (terminal|pier) [a-z0-9\-]+/,
          /^(information|details|data) (about|on|for) (terminal|pier|stand|gate) [a-z0-9\-]+/,
          /^(show|list|what are) (the |all )?(terminal|pier|stand|gate) (details|specifications|specs)/
        ],
        confidence: 0.85
      },
      {
        intent: this.intents.SCENARIO_CREATE,
        patterns: [
          /^(create|make|build|start) (a |new )?(scenario|what-if|simulation)/,
          /^(let's|i want to|can you) (create|make|build|start) (a |new )?(scenario|what-if|simulation)/,
          /^simulate (what|how) (would happen|it would be) if/,
          /^what if (we|i) (change|modify|adjust|increase|decrease|add|remove)/
        ],
        confidence: 0.85
      },
      {
        intent: this.intents.SCENARIO_QUERY,
        patterns: [
          /^(show|list|get|what are) (my|the|all|saved) scenarios/,
          /^(show|display|get|what is) (details|information|data) (of|for|about) scenario [a-z0-9\-]+/,
          /^(tell|show) me (about|what's in) (scenario|simulation) [a-z0-9\-]+/
        ],
        confidence: 0.85
      },
      {
        intent: this.intents.VISUALIZATION_COMMAND,
        patterns: [
          /^(show|display|visualize|draw|plot|graph|chart)/,
          /^(create|generate|make) a (chart|graph|visualization|plot|dashboard)/,
          /^(visualize|plot|graph) (the |all |)(capacity|stands|gates|maintenance|flights|aircraft)/,
          /^(can you |please |)(show|give) me a (visual|chart|graph|plot|map) of/
        ],
        confidence: 0.8
      },
      {
        intent: this.intents.WHAT_IF_ANALYSIS,
        patterns: [
          /^what (would happen|if) (we|i) (close|open|add|remove|change)/,
          /^how would (capacity|operations|flights) be affected if/,
          /^analyze (the |)impact of/,
          /^compare (capacity|operations) (with|without|before|after)/,
          /^simulate (closing|opening|adding|removing)/
        ],
        confidence: 0.85
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
    
    // Prepare domain-specific vocabulary for entity extraction
    // This helps the model recognize domain-specific terms
    const domainVocabulary = { ...this.vocabulary };
    
    // Create a combined list of terminals from both cache and vocabulary
    const terminalList = [
      ...(this.entityCache.terminals || []).map(t => t.code),
      ...(domainVocabulary.terminals || []),
      ...(domainVocabulary.terminalsFromDb || []),
      ...(domainVocabulary.terminalNames || [])
    ];
    
    // Create a combined list of stands from both cache and vocabulary
    const standList = [
      ...(this.entityCache.stands || []).map(s => s.name),
      ...(domainVocabulary.standExamples || [])
    ];
    
    // Create a combined list of aircraft types
    const aircraftTypeList = [
      ...(this.entityCache.aircraftTypes || []).map(a => a.iataCode),
      ...(this.entityCache.aircraftTypes || []).map(a => a.icaoCode),
      ...(this.entityCache.aircraftTypes || []).map(a => a.name),
      ...(domainVocabulary.aircraftTypes || [])
    ];
    
    // Create a combined list of airlines
    const airlineList = [
      ...(this.entityCache.airlines || []).map(a => a.iataCode),
      ...(this.entityCache.airlines || []).map(a => a.name),
      ...(domainVocabulary.airlines || []),
      ...(domainVocabulary.airlineCodesFromDb || []),
      ...(domainVocabulary.airlineNamesFromDb || [])
    ];
    
    // Pre-process query to try to detect entities using pattern matching
    // This helps with common entity formats before using the LLM
    const detectedEntities = this._detectEntitiesWithPatterns(query);
    
    // Extract entities using OpenAI
    const result = await openaiService.extractEntities(query, {
      intent,
      context: {
        ...context,
        detectedEntities, // Pass any entities we already detected
        entityLists: {
          terminals: terminalList,
          stands: standList,
          aircraftTypes: aircraftTypeList,
          airlines: airlineList,
          timeExpressions: domainVocabulary.timeExpressions || [],
          capacityMetrics: domainVocabulary.capacityMetrics || [],
          maintenanceTerms: domainVocabulary.maintenanceTerms || [],
          operationalTerms: domainVocabulary.operationalTerms || []
        },
        domain: 'airport_capacity_planning'
      }
    });
    
    // Post-process entities
    const processedEntities = {};
    
    // Start with any entities detected by pattern matching
    for (const [key, value] of Object.entries(detectedEntities)) {
      processedEntities[key] = value;
    }
    
    // Add and normalize each entity from the LLM
    for (const [key, value] of Object.entries(result.entities || {})) {
      const normalizedValue = this._normalizeEntity(key, value);
      if (normalizedValue !== null) {
        processedEntities[key] = normalizedValue;
      }
    }
    
    // Enhance entities with additional context where possible
    await this._enhanceEntitiesWithContext(processedEntities, query, intent, context);
    
    return processedEntities;
  }
  
  /**
   * Detect common entity patterns before using the LLM
   * @private
   * @param {string} query - The preprocessed query
   * @returns {Object} - Detected entities
   */
  _detectEntitiesWithPatterns(query) {
    const entities = {};
    
    // Terminal patterns (e.g., T1, Terminal 2)
    const terminalPattern = /\b(?:terminal|term)[.\s-]*(\d+|[a-z]|one|two|three|four|five)\b|\bT(\d+|[a-z])\b/gi;
    const terminalMatches = [...query.matchAll(terminalPattern)];
    
    if (terminalMatches.length > 0) {
      const terminals = terminalMatches.map(match => {
        const identifier = match[1] || match[2];
        // Normalize terminal identifier
        let terminalId = identifier.toUpperCase();
        // Convert word numbers to digits
        const wordToDigit = { 'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5' };
        if (wordToDigit[terminalId]) {
          terminalId = wordToDigit[terminalId];
        }
        return `T${terminalId}`;
      });
      
      entities[this.entityTypes.TERMINAL] = terminals.length === 1 ? terminals[0] : terminals;
    }
    
    // Stand patterns (e.g., stand 12A, gate 23B)
    const standPattern = /\b(?:stand|gate|s)[.\s-]*([a-z]?\d+[a-z]?)\b|\b([a-z]?\d+[a-z]?)\s+(?:stand|gate)\b/gi;
    const standMatches = [...query.matchAll(standPattern)];
    
    if (standMatches.length > 0) {
      const stands = standMatches.map(match => {
        const identifier = match[1] || match[2];
        return identifier.toUpperCase();
      });
      
      entities[this.entityTypes.STAND] = stands.length === 1 ? stands[0] : stands;
    }
    
    // Aircraft type patterns (e.g., B737, A320, Boeing 737)
    const aircraftPattern = /\b(?:boeing|b)[.\s-]*(\d{3}(?:-\d+)?)\b|\b(?:airbus|a)[.\s-]*(\d{3}(?:-\d+)?)\b/gi;
    const aircraftMatches = [...query.matchAll(aircraftPattern)];
    
    if (aircraftMatches.length > 0) {
      const aircraft = aircraftMatches.map(match => {
        const isBoeing = !!match[1];
        const identifier = match[1] || match[2];
        return isBoeing ? `B${identifier}` : `A${identifier}`;
      });
      
      entities[this.entityTypes.AIRCRAFT_TYPE] = aircraft.length === 1 ? aircraft[0] : aircraft;
    }
    
    // Airline patterns (e.g., BA, British Airways)
    const airlinePattern = /\b([A-Z]{2,3})\b|\b(British Airways|Lufthansa|Air France|KLM|Ryanair|EasyJet)\b/gi;
    const airlineMatches = [...query.matchAll(airlinePattern)];
    
    if (airlineMatches.length > 0) {
      const airlines = airlineMatches.map(match => match[1] || match[2]);
      entities[this.entityTypes.AIRLINE] = airlines.length === 1 ? airlines[0] : airlines;
    }
    
    // Date patterns (e.g., 2023-05-15, May 15)
    const datePattern = /\b(\d{4}-\d{2}-\d{2})\b|\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/gi;
    const dateMatches = [...query.matchAll(datePattern)];
    
    if (dateMatches.length > 0) {
      const dates = dateMatches.map(match => match[0]);
      entities[this.entityTypes.DATE] = dates.length === 1 ? dates[0] : dates;
    }
    
    return entities;
  }
  
  /**
   * Enhance entities with additional context
   * @private
   * @param {Object} entities - Detected entities
   * @param {string} query - Original query
   * @param {string} intent - Detected intent
   * @param {Object} context - Processing context
   * @returns {Promise<void>}
   */
  async _enhanceEntitiesWithContext(entities, query, intent, context) {
    // Add time context if not present
    if (!entities[this.entityTypes.TIME_PERIOD] && !entities[this.entityTypes.DATE]) {
      // Check for common time references in the query
      if (query.includes('today') || query.includes('now') || query.includes('current')) {
        entities[this.entityTypes.TIME_PERIOD] = {
          type: 'day',
          start: new Date(),
          end: new Date(),
          expression: 'today',
          iso: {
            start: new Date().toISOString(),
            end: new Date().toISOString()
          }
        };
      }
    }
    
    // For maintenance queries, add status if not present
    if (intent === this.intents.MAINTENANCE_QUERY && !entities['status']) {
      if (query.includes('ongoing') || query.includes('current')) {
        entities['status'] = 'in_progress';
      } else if (query.includes('planned') || query.includes('scheduled')) {
        entities['status'] = 'scheduled';
      } else if (query.includes('completed') || query.includes('finished')) {
        entities['status'] = 'completed';
      }
    }
    
    // For capacity queries, add metrics if not present
    if (intent === this.intents.CAPACITY_QUERY && !entities['metric']) {
      if (query.includes('utilization')) {
        entities['metric'] = 'utilization';
      } else if (query.includes('availability')) {
        entities['metric'] = 'availability';
      } else if (query.includes('occupancy')) {
        entities['metric'] = 'occupancy';
      } else {
        // Default metric for capacity queries
        entities['metric'] = 'capacity';
      }
    }
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
          // Match different ways of specifying terminals
          // Examples: "terminal 1", "terminal T1", "term 1", "T1", "Terminal One"
          const terminalMatch = value.match(/(?:terminal|term)[.\s-]*(\d+|[a-z]|one|two|three|four|five)/i);
          if (terminalMatch) {
            let terminalId = terminalMatch[1].toUpperCase();
            
            // Convert word numbers to digits
            const wordToDigit = { 'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5' };
            if (wordToDigit[terminalId]) {
              terminalId = wordToDigit[terminalId];
            }
            
            return `T${terminalId}`;
          }
          
          // Match just a T followed by a number/letter
          const directMatch = value.match(/^T(\d+|[a-z])$/i);
          if (directMatch) {
            return `T${directMatch[1].toUpperCase()}`;
          }
        }
        return value;
        
      case this.entityTypes.STAND:
        // Normalize stand references
        if (typeof value === 'string') {
          // Match different ways of specifying stands
          // Examples: "stand 12A", "gate 12A", "stand-12A", "s12A", "12A"
          const standMatch = value.match(/(?:stand|gate|s)[.\s-]*([a-z]?\d+[a-z]?)/i);
          if (standMatch) {
            return standMatch[1].toUpperCase();
          }
          
          // Match just a stand number/code without prefix
          const directStandMatch = value.match(/^([a-z]?\d+[a-z]?)$/i);
          if (directStandMatch) {
            return directStandMatch[1].toUpperCase();
          }
        }
        return value;
        
      case this.entityTypes.AIRCRAFT_TYPE:
        // Normalize aircraft type references
        if (typeof value === 'string') {
          // Extract IATA or ICAO aircraft codes
          // Examples: "B737", "A320", "Boeing 737", "Airbus A320"
          const aircraftMatch = value.match(/(?:boeing|airbus|bombardier|embraer)?\s*([a-z])?(\d{3}(?:-\d+)?)/i);
          if (aircraftMatch) {
            const prefix = aircraftMatch[1] ? aircraftMatch[1].toUpperCase() : '';
            return `${prefix}${aircraftMatch[2]}`;
          }
          
          // Match common aircraft type references
          // Examples: "B737", "A320"
          const codeMatch = value.match(/^([a-z])(\d{3}(?:-\d+)?)$/i);
          if (codeMatch) {
            return `${codeMatch[1].toUpperCase()}${codeMatch[2]}`;
          }
        }
        return value;
        
      case this.entityTypes.AIRLINE:
        // Normalize airline references
        if (typeof value === 'string') {
          // Extract airline codes
          // Examples: "BA", "British Airways", "American Airlines (AA)"
          const airlineCodeMatch = value.match(/\(([A-Z]{2,3})\)$/);
          if (airlineCodeMatch) {
            return airlineCodeMatch[1];
          }
          
          // Match just a 2-3 letter code
          const codeOnlyMatch = value.match(/^([A-Z]{2,3})$/);
          if (codeOnlyMatch) {
            return codeOnlyMatch[1];
          }
          
          // Use original value for full airline names
          // These will be matched against the database in later processing
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
        
      case this.entityTypes.LOCATION:
        // Normalize location references
        if (typeof value === 'string') {
          // Handle comma-separated coordinates
          const coordsMatch = value.match(/(\d+\.\d+),\s*(\d+\.\d+)/);
          if (coordsMatch) {
            return {
              type: 'coordinates',
              latitude: parseFloat(coordsMatch[1]),
              longitude: parseFloat(coordsMatch[2])
            };
          }
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
      // Start with static vocabulary
      this.vocabulary = {
        airports: ['LHR', 'LGW', 'MAN', 'EDI', 'GLA', 'BHX', 'AMS', 'CDG', 'FRA', 'MAD', 'BCN'],
        terminals: ['T1', 'T2', 'T3', 'T4', 'T5', 'Terminal 1', 'Terminal 2', 'Terminal 3', 'Terminal 4', 'Terminal 5'],
        standTypes: [
          'contact', 'remote', 'cargo', 'widebody', 'narrowbody', 
          'domestic', 'international', 'regional', 'apron', 'hardstand',
          'MARS', 'multi-aircraft', 'flexible', 'fixed'
        ],
        airlines: [
          'BA', 'EZY', 'RYR', 'LH', 'AF', 'KLM', 'DL', 'AA', 'UA', 'QR',
          'British Airways', 'EasyJet', 'Ryanair', 'Lufthansa', 'Air France',
          'KLM Royal Dutch Airlines', 'Delta Air Lines', 'American Airlines',
          'United Airlines', 'Qatar Airways', 'Emirates', 'EK', 'Singapore Airlines', 'SQ'
        ],
        aircraftTypes: [
          'A320', 'A321', 'A330', 'A350', 'A380', 
          'B737', 'B747', 'B777', 'B787', 'E190',
          'Airbus A320', 'Airbus A321', 'Airbus A330', 'Airbus A350', 'Airbus A380',
          'Boeing 737', 'Boeing 747', 'Boeing 777', 'Boeing 787', 'Embraer 190'
        ],
        aircraftCategories: [
          'A', 'B', 'C', 'D', 'E', 'F',
          'Category A', 'Category B', 'Category C', 'Category D', 'Category E', 'Category F',
          'small', 'medium', 'large', 'heavy', 'super', 'regional', 'narrowbody', 'widebody'
        ],
        timeUnits: ['minute', 'hour', 'day', 'week', 'month', 'year'],
        timeExpressions: [
          'today', 'tomorrow', 'yesterday', 
          'this week', 'next week', 'last week',
          'this month', 'next month', 'last month',
          'morning peak', 'evening peak', 'off-peak',
          'busy period', 'quiet period'
        ],
        capacityMetrics: [
          'utilization', 'availability', 'occupancy', 'efficiency',
          'capacity', 'throughput', 'saturation', 'load factor',
          'peak capacity', 'effective capacity', 'theoretical capacity',
          'stand hours', 'turnaround time', 'buffer time'
        ],
        visualizationTypes: [
          'chart', 'graph', 'map', 'table', 'gantt', 'dashboard',
          'bar chart', 'line chart', 'pie chart', 'heatmap', 'timeline',
          'scatter plot', 'bubble chart', 'waterfall chart', '3D visualization',
          'comparison chart', 'trend analysis', 'forecast visualization'
        ],
        maintenanceTerms: [
          'scheduled', 'unscheduled', 'emergency', 'preventive', 'routine',
          'maintenance', 'repair', 'closure', 'refurbishment', 'upgrade',
          'construction', 'renovation', 'inspection', 'downtime', 'outage',
          'service', 'work', 'overhaul', 'restoration'
        ],
        operationalTerms: [
          'on-time performance', 'delay', 'cancellation', 'diversion',
          'turnaround', 'buffer', 'block time', 'taxi time', 'handling time',
          'arrival', 'departure', 'landing', 'takeoff', 'pushback',
          'boarding', 'deboarding', 'loading', 'unloading', 'fueling'
        ],
        scenarioTerms: [
          'scenario', 'simulation', 'model', 'what-if', 'forecast',
          'projection', 'prediction', 'analysis', 'comparison', 'baseline',
          'variant', 'alternative', 'option', 'strategy', 'plan',
          'historical', 'current', 'future', 'target', 'objective'
        ]
      };
      
      // Try to load additional vocabulary from database
      try {
        // Get terminal names from database
        const terminals = await db('terminals').select('code', 'name');
        this.vocabulary.terminalsFromDb = terminals.map(t => t.code);
        this.vocabulary.terminalNames = terminals.map(t => t.name);
        
        // Get pier names from database
        const piers = await db('piers').select('code', 'name');
        this.vocabulary.piersFromDb = piers.map(p => p.code);
        this.vocabulary.pierNames = piers.map(p => p.name);
        
        // Get some common stand codes
        const stands = await db('stands').select('code').limit(100);
        this.vocabulary.standExamples = stands.map(s => s.code);
        
        // Get airline codes and names
        const airlines = await db('airlines').select('iata_code', 'name').limit(50);
        this.vocabulary.airlineCodesFromDb = airlines.map(a => a.iata_code);
        this.vocabulary.airlineNamesFromDb = airlines.map(a => a.name);
        
        logger.debug('Database vocabulary loaded');
      } catch (dbError) {
        logger.warn(`Could not load vocabulary from database: ${dbError.message}`);
        // Continue with static vocabulary
      }
      
      logger.debug('Domain vocabulary loaded');
    } catch (error) {
      logger.error(`Error loading domain vocabulary: ${error.message}`);
      // Initialize with basic vocabulary
      this.vocabulary = {
        airports: ['LHR', 'LGW', 'MAN', 'EDI', 'GLA', 'BHX'],
        terminals: ['T1', 'T2', 'T3', 'T4', 'T5'],
        standTypes: ['contact', 'remote', 'cargo', 'widebody', 'narrowbody'],
        airlines: ['BA', 'EZY', 'RYR', 'LH', 'AF', 'KLM', 'DL', 'AA', 'UA', 'QR'],
        timeUnits: ['minute', 'hour', 'day', 'week', 'month', 'year'],
        capacityMetrics: ['utilization', 'availability', 'occupancy', 'efficiency'],
        visualizationTypes: ['chart', 'graph', 'map', 'table', 'gantt', 'dashboard']
      };
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