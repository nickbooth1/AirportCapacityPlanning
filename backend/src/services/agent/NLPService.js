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
      // Airport infrastructure entities
      TERMINAL: 'terminal',
      STAND: 'stand',
      GATE: 'gate',
      PIER: 'pier',
      APRON: 'apron',
      TAXIWAY: 'taxiway',
      RUNWAY: 'runway',
      
      // Aircraft and flight entities
      AIRCRAFT_TYPE: 'aircraft_type',
      AIRCRAFT_CATEGORY: 'aircraft_category', 
      AIRCRAFT_SIZE: 'aircraft_size',
      AIRCRAFT_BODY_TYPE: 'aircraft_body_type',
      FLIGHT_NUMBER: 'flight_number',
      FLIGHT_TYPE: 'flight_type',
      FLIGHT_DIRECTION: 'flight_direction',
      
      // Time and scheduling entities
      TIME_PERIOD: 'time_period',
      DATE: 'date',
      TIME: 'time',
      DURATION: 'duration',
      SCHEDULE_DAYS: 'schedule_days',
      PEAK_PERIOD: 'peak_period',
      
      // Airline and operation entities
      AIRLINE: 'airline',
      AIRLINE_ALLIANCE: 'airline_alliance',
      GROUND_HANDLING_AGENT: 'ground_handling_agent',
      HANDLER: 'handler',
      HANDLER_CATEGORY: 'handler_category',
      
      // Capacity and utilization entities
      CAPACITY_METRIC: 'capacity_metric',
      UTILIZATION_METRIC: 'utilization_metric',
      TURNAROUND_TIME: 'turnaround_time',
      BUFFER_TIME: 'buffer_time',
      OCCUPANCY_RATE: 'occupancy_rate',
      
      // Maintenance entities
      MAINTENANCE_TYPE: 'maintenance_type',
      MAINTENANCE_STATUS: 'maintenance_status',
      MAINTENANCE_DURATION: 'maintenance_duration',
      MAINTENANCE_PRIORITY: 'maintenance_priority',
      
      // Scenario and planning entities
      SCENARIO_PARAMETER: 'scenario_parameter',
      SCENARIO_NAME: 'scenario_name',
      COMPARISON_METRIC: 'comparison_metric',
      
      // Quantity and measurement entities
      QUANTITY: 'quantity',
      PERCENTAGE: 'percentage',
      LOCATION: 'location',
      
      // Stakeholder entities
      PERSON: 'person',
      ORGANIZATION: 'organization',
      ROLE: 'role',
      TEAM: 'team',
      
      // Visualization and data entities
      VISUALIZATION_TYPE: 'visualization_type',
      DATA_FORMAT: 'data_format',
      REPORT_TYPE: 'report_type',
      CHART_TYPE: 'chart_type',
      
      // Autonomous operations entities
      AUTONOMOUS_LEVEL: 'autonomous_level',
      OPERATING_MODE: 'operating_mode'
    };

    // Initialize entity cache
    this.entityCache = {
      terminals: null,
      stands: null,
      piers: null,
      aircraftTypes: null,
      airlines: null,
      groundHandlingAgents: null,
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
      
      // Use ResponseGeneratorService for template-based responses
      const responseGeneratorService = require('./ResponseGeneratorService');
      const response = await responseGeneratorService.generateResponse({
        query: input.query || '',
        intent,
        entities,
        data: actionResult,
        options: {
          templateType: options.templateType || 'default',
          useLLM: options.useLLM !== false,
          includeSuggestions: options.includeSuggestions !== false,
          tone: options.tone || 'professional',
          detail: options.detail || 'medium',
          format: responseType
        }
      });
      
      return {
        responseText: response.text,
        responseSpeech: response.speech || response.text,
        suggestedActions: response.suggestedActions || [],
        visualizations: response.visualizations || [],
        responseType
      };
    } catch (error) {
      logger.error(`Response Generation Error: ${error.message}`, { error: error.stack });
      
      // Fallback to a generic response based on intent
      const fallbackResponses = {
        [this.intents.CAPACITY_QUERY]: "Here is the capacity information you requested.",
        [this.intents.MAINTENANCE_QUERY]: "Here is the maintenance information you requested.",
        [this.intents.INFRASTRUCTURE_QUERY]: "Here is the infrastructure information you requested.",
        [this.intents.STAND_STATUS_QUERY]: "Here is the stand status you requested.",
        [this.intents.SCENARIO_QUERY]: "Here is the scenario information you requested.",
        [this.intents.UNKNOWN]: "I'm sorry, I couldn't process that request."
      };
      
      return {
        responseText: fallbackResponses[intent] || fallbackResponses[this.intents.UNKNOWN],
        responseSpeech: fallbackResponses[intent] || fallbackResponses[this.intents.UNKNOWN],
        suggestedActions: [],
        visualizations: [],
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
      piers: null,
      aircraftTypes: null,
      airlines: null,
      groundHandlingAgents: null,
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
      ...(this.entityCache.terminals || []).map(t => t.name),
      ...(domainVocabulary.terminals || []),
      ...(domainVocabulary.terminalsFromDb || []),
      ...(domainVocabulary.terminalNames || [])
    ].filter(Boolean);
    
    // Create a combined list of stands from both cache and vocabulary
    const standList = [
      ...(this.entityCache.stands || []).map(s => s.name),
      ...(domainVocabulary.standExamples || [])
    ].filter(Boolean);
    
    // Create a combined list of aircraft types
    const aircraftTypeList = [
      ...(this.entityCache.aircraftTypes || []).map(a => a.iataCode),
      ...(this.entityCache.aircraftTypes || []).map(a => a.icaoCode),
      ...(this.entityCache.aircraftTypes || []).map(a => a.name),
      ...(domainVocabulary.aircraftTypes || [])
    ].filter(Boolean);
    
    // Create a combined list of airlines
    const airlineList = [
      ...(this.entityCache.airlines || []).map(a => a.iataCode),
      ...(this.entityCache.airlines || []).map(a => a.name),
      ...(domainVocabulary.airlines || []),
      ...(domainVocabulary.airlineCodesFromDb || []),
      ...(domainVocabulary.airlineNamesFromDb || [])
    ].filter(Boolean);
    
    // Create a list of piers from the vocabulary and cache
    const pierList = [
      ...(this.entityCache.piers || []).map(p => p.name),
      ...(domainVocabulary.piers || [])
    ].filter(Boolean);
    
    // Pre-process query to try to detect entities using pattern matching
    // This helps with common entity formats before using the LLM
    const detectedEntities = this._detectEntitiesWithPatterns(query);
    
    // Create domain context to enhance entity extraction
    const domainContext = {
      terminals: terminalList,
      stands: standList,
      aircraftTypes: aircraftTypeList,
      airlines: airlineList,
      piers: pierList
    };
    
    // Extract entities using our enhanced OpenAI service with domain knowledge
    const result = await openaiService.extractEntities(query, {
      preDetectedEntities: detectedEntities, // Pass any entities we already detected
      domainContext, // Pass knowledge of domain entities
      examples: domainVocabulary.entityExtractionExamples || [] // Optional few-shot learning examples
    });
    
    // The enhanced OpenAI service now handles entity normalization and merging
    let processedEntities = result.entities || {};
    
    // Enrich entities with database information and contextual defaults
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
    
    // Airport Infrastructure Entities
    
    // Terminal patterns (e.g., T1, Terminal 2, Term 3, International Terminal)
    const terminalPattern = /\b(?:terminal|term)[.\s-]*(\d+|[a-z]|one|two|three|four|five)\b|\bT(\d+|[a-z])\b|\b(international|domestic|main|satellite|north|south|east|west)\s+terminal\b/gi;
    const terminalMatches = [...query.matchAll(terminalPattern)];
    
    if (terminalMatches.length > 0) {
      const terminals = terminalMatches.map(match => {
        // Check for named terminals like "International Terminal"
        if (match[3]) {
          return `${match[3].charAt(0).toUpperCase() + match[3].slice(1)} Terminal`;
        }
        
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
    
    // Stand/Gate patterns (e.g., stand 12A, gate 23B, parking position A15)
    const standPattern = /\b(?:stand|gate|s|parking\s+position|position|bay)[.\s-]*([a-z]?\d+[a-z]?)\b|\b([a-z]?\d+[a-z]?)\s+(?:stand|gate|position)\b/gi;
    const standMatches = [...query.matchAll(standPattern)];
    
    if (standMatches.length > 0) {
      const stands = standMatches.map(match => {
        const identifier = match[1] || match[2];
        return identifier.toUpperCase();
      });
      
      entities[this.entityTypes.STAND] = stands.length === 1 ? stands[0] : stands;
    }
    
    // Gate patterns (if different from stands in this context)
    const gatePattern = /\b(?:gate)[.\s-]*([a-z]?\d+[a-z]?)\b|\b([a-z]?\d+[a-z]?)\s+(?:gate)\b/gi;
    const gateMatches = [...query.matchAll(gatePattern)];
    
    if (gateMatches.length > 0 && !entities[this.entityTypes.STAND]) {
      const gates = gateMatches.map(match => {
        const identifier = match[1] || match[2];
        return identifier.toUpperCase();
      });
      
      entities[this.entityTypes.GATE] = gates.length === 1 ? gates[0] : gates;
    }
    
    // Pier patterns (e.g., Pier A, North Pier)
    const pierPattern = /\b(?:pier|concourse|wing)[.\s-]*([a-z]|\d+)\b|\b(north|south|east|west|international|domestic)\s+(?:pier|concourse|wing)\b/gi;
    const pierMatches = [...query.matchAll(pierPattern)];
    
    if (pierMatches.length > 0) {
      const piers = pierMatches.map(match => {
        if (match[2]) {
          return `${match[2].charAt(0).toUpperCase() + match[2].slice(1)} Pier`;
        }
        return `Pier ${match[1].toUpperCase()}`;
      });
      
      entities[this.entityTypes.PIER] = piers.length === 1 ? piers[0] : piers;
    }
    
    // Aircraft and Flight Entities
    
    // Aircraft type patterns (e.g., B737, A320, Boeing 737, Airbus A380)
    const aircraftPattern = /\b(?:boeing|b)[.\s-]*(\d{3}(?:-\d+)?)\b|\b(?:airbus|a)[.\s-]*(\d{3}(?:-\d+)?)\b|\b(?:embraer|e)[.\s-]*(\d{1,3}(?:-\d+)?)\b|\b(?:bombardier|crj|cseries)[.\s-]*(\d{1,3}(?:-\d+)?)\b/gi;
    const aircraftMatches = [...query.matchAll(aircraftPattern)];
    
    if (aircraftMatches.length > 0) {
      const aircraft = aircraftMatches.map(match => {
        if (match[1]) return `B${match[1]}`; // Boeing
        if (match[2]) return `A${match[2]}`; // Airbus
        if (match[3]) return `E${match[3]}`; // Embraer
        if (match[4]) return `CRJ${match[4]}`; // Bombardier
        return match[0]; // Fallback to original match
      });
      
      entities[this.entityTypes.AIRCRAFT_TYPE] = aircraft.length === 1 ? aircraft[0] : aircraft;
    }
    
    // Aircraft category patterns (e.g., Category A, ICAO category C)
    const categoryPattern = /\b(?:category|cat)[.\s-]*([a-f])\b|\b(light|medium|heavy|super|jumbo)\s+(?:aircraft|airplane|plane)\b/gi;
    const categoryMatches = [...query.matchAll(categoryPattern)];
    
    if (categoryMatches.length > 0) {
      const categories = categoryMatches.map(match => {
        if (match[1]) return match[1].toUpperCase(); // Letter category
        
        // Map descriptive categories to standard categories
        const categoryMap = {
          'light': 'A',
          'medium': 'C',
          'heavy': 'E',
          'super': 'F',
          'jumbo': 'F'
        };
        
        return categoryMap[match[2].toLowerCase()] || match[2];
      });
      
      entities[this.entityTypes.AIRCRAFT_CATEGORY] = categories.length === 1 ? categories[0] : categories;
    }
    
    // Aircraft body type (e.g., narrowbody, widebody)
    const bodyTypePattern = /\b(narrowbody|widebody|regional|narrow\s+body|wide\s+body)\b/gi;
    const bodyTypeMatches = [...query.matchAll(bodyTypePattern)];
    
    if (bodyTypeMatches.length > 0) {
      const bodyTypes = bodyTypeMatches.map(match => {
        const bodyType = match[1].replace(/\s+/g, '').toLowerCase();
        return bodyType.charAt(0).toUpperCase() + bodyType.slice(1);
      });
      
      entities[this.entityTypes.AIRCRAFT_BODY_TYPE] = bodyTypes.length === 1 ? bodyTypes[0] : bodyTypes;
    }
    
    // Flight number patterns (e.g., BA123, LH 456, Flight AF789)
    const flightPattern = /\b(?:flight\s+)?([a-z]{2})\s*(\d{1,4}[a-z]?)\b/gi;
    const flightMatches = [...query.matchAll(flightPattern)];
    
    if (flightMatches.length > 0) {
      const flights = flightMatches.map(match => {
        return `${match[1].toUpperCase()}${match[2]}`;
      });
      
      entities[this.entityTypes.FLIGHT_NUMBER] = flights.length === 1 ? flights[0] : flights;
    }
    
    // Flight direction (e.g., arrival, departure, inbound, outbound)
    const directionPattern = /\b(arrival|departure|arriving|departing|inbound|outbound)\b/gi;
    const directionMatches = [...query.matchAll(directionPattern)];
    
    if (directionMatches.length > 0) {
      const directions = directionMatches.map(match => {
        const dir = match[1].toLowerCase();
        if (dir === 'arriving') return 'arrival';
        if (dir === 'departing') return 'departure';
        return dir;
      });
      
      entities[this.entityTypes.FLIGHT_DIRECTION] = directions.length === 1 ? directions[0] : directions;
    }
    
    // Flight type (e.g., international, domestic, cargo, passenger)
    const flightTypePattern = /\b(international|domestic|regional|cargo|passenger|charter|ferry|training)\s+(?:flight|service|operation)s?\b/gi;
    const flightTypeMatches = [...query.matchAll(flightTypePattern)];
    
    if (flightTypeMatches.length > 0) {
      const types = flightTypeMatches.map(match => match[1].toLowerCase());
      entities[this.entityTypes.FLIGHT_TYPE] = types.length === 1 ? types[0] : types;
    }
    
    // Time and Scheduling Entities
    
    // Date patterns (e.g., 2023-05-15, May 15, 15/05/2023)
    const datePattern = /\b(\d{4}-\d{2}-\d{2})\b|\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b|\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.\s-]*(\d{1,2})(?:[,\s-]+(\d{2,4}))?\b/gi;
    const dateMatches = [...query.matchAll(datePattern)];
    
    if (dateMatches.length > 0) {
      const dates = dateMatches.map(match => match[0]);
      entities[this.entityTypes.DATE] = dates.length === 1 ? dates[0] : dates;
    }
    
    // Time patterns (e.g., 9:30, 14:45, 2 PM)
    const timePattern = /\b(\d{1,2})[:\.](\d{2})(?:\s*(am|pm))?\b|\b(\d{1,2})\s*(am|pm)\b/gi;
    const timeMatches = [...query.matchAll(timePattern)];
    
    if (timeMatches.length > 0) {
      const times = timeMatches.map(match => match[0]);
      entities[this.entityTypes.TIME] = times.length === 1 ? times[0] : times;
    }
    
    // Time period expressions (e.g., morning, afternoon, evening, night)
    const periodPattern = /\b(morning|afternoon|evening|night|overnight|early morning|late night|peak hours?|off-peak|busy period)\b/gi;
    const periodMatches = [...query.matchAll(periodPattern)];
    
    if (periodMatches.length > 0) {
      const periods = periodMatches.map(match => match[1].toLowerCase());
      entities[this.entityTypes.PEAK_PERIOD] = periods.length === 1 ? periods[0] : periods;
    }
    
    // Duration patterns (e.g., 2 hours, 30 minutes, 3 days)
    const durationPattern = /\b(\d+)\s+(minute|hour|day|week|month|year)s?\b/gi;
    const durationMatches = [...query.matchAll(durationPattern)];
    
    if (durationMatches.length > 0) {
      const durations = durationMatches.map(match => `${match[1]} ${match[2]}${parseInt(match[1]) > 1 ? 's' : ''}`);
      entities[this.entityTypes.DURATION] = durations.length === 1 ? durations[0] : durations;
    }
    
    // Schedule day patterns (e.g., Monday, weekends, weekdays)
    const dayPattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|weekend|working day|holiday)\b/gi;
    const dayMatches = [...query.matchAll(dayPattern)];
    
    if (dayMatches.length > 0) {
      const days = dayMatches.map(match => match[1].toLowerCase());
      entities[this.entityTypes.SCHEDULE_DAYS] = days.length === 1 ? days[0] : days;
    }
    
    // Airline and Operation Entities
    
    // Airline patterns (e.g., BA, British Airways, Lufthansa)
    const airlinePattern = /\b([A-Z]{2,3})\b|\b(British Airways|Lufthansa|Air France|KLM|Ryanair|EasyJet|Emirates|Qatar Airways|Delta Air Lines|United Airlines|American Airlines|Singapore Airlines)\b/gi;
    const airlineMatches = [...query.matchAll(airlinePattern)];
    
    if (airlineMatches.length > 0) {
      const airlines = airlineMatches.map(match => match[1] || match[2]);
      entities[this.entityTypes.AIRLINE] = airlines.length === 1 ? airlines[0] : airlines;
    }
    
    // Airline alliance patterns (e.g., Star Alliance, OneWorld, SkyTeam)
    const alliancePattern = /\b(Star Alliance|OneWorld|SkyTeam)\b/gi;
    const allianceMatches = [...query.matchAll(alliancePattern)];
    
    if (allianceMatches.length > 0) {
      const alliances = allianceMatches.map(match => match[1]);
      entities[this.entityTypes.AIRLINE_ALLIANCE] = alliances.length === 1 ? alliances[0] : alliances;
    }
    
    // Ground handling agent patterns (e.g., Swissport, Menzies, dnata)
    const ghaPattern = /\b(Swissport|Menzies|dnata|Worldwide Flight Services|WFS|Aviapartner)\b/gi;
    const ghaMatches = [...query.matchAll(ghaPattern)];
    
    if (ghaMatches.length > 0) {
      const ghas = ghaMatches.map(match => match[1]);
      entities[this.entityTypes.GROUND_HANDLING_AGENT] = ghas.length === 1 ? ghas[0] : ghas;
    }
    
    // Maintenance Entities
    
    // Maintenance type patterns (e.g., scheduled, emergency, routine)
    const maintTypePattern = /\b(scheduled|unscheduled|emergency|routine|preventive|corrective|periodic|annual|monthly)\s+(maintenance|repair|service|check|inspection)\b/gi;
    const maintTypeMatches = [...query.matchAll(maintTypePattern)];
    
    if (maintTypeMatches.length > 0) {
      const types = maintTypeMatches.map(match => `${match[1]} ${match[2]}`.toLowerCase());
      entities[this.entityTypes.MAINTENANCE_TYPE] = types.length === 1 ? types[0] : types;
    }
    
    // Maintenance status patterns (e.g., pending, in progress, completed)
    const maintStatusPattern = /\b(pending|scheduled|in progress|ongoing|active|completed|finished|cancelled|delayed|paused)\s+(maintenance|repair|work)\b/gi;
    const maintStatusMatches = [...query.matchAll(maintStatusPattern)];
    
    if (maintStatusMatches.length > 0) {
      const statuses = maintStatusMatches.map(match => {
        const status = match[1].toLowerCase();
        if (status === 'ongoing' || status === 'active') return 'in_progress';
        if (status === 'finished') return 'completed';
        return status.replace(/\s+/g, '_');
      });
      
      entities[this.entityTypes.MAINTENANCE_STATUS] = statuses.length === 1 ? statuses[0] : statuses;
    }
    
    // Capacity Metrics
    
    // Capacity metric patterns (e.g., utilization, availability, occupancy rate)
    const capacityMetricPattern = /\b(utilization|availability|occupancy|saturation|efficiency|throughput|capacity)\s+(rate|percentage|level|metrics?|statistics?|ratio|factor)?\b/gi;
    const capacityMetricMatches = [...query.matchAll(capacityMetricPattern)];
    
    if (capacityMetricMatches.length > 0) {
      const metrics = capacityMetricMatches.map(match => match[1].toLowerCase());
      entities[this.entityTypes.CAPACITY_METRIC] = metrics.length === 1 ? metrics[0] : metrics;
    }
    
    // Turnaround time patterns (e.g., turnaround time, handling time)
    const turnaroundPattern = /\b(turnaround|turn-?around|handling|processing|ground)\s+(time|duration|period)\b/gi;
    const turnaroundMatches = [...query.matchAll(turnaroundPattern)];
    
    if (turnaroundMatches.length > 0) {
      const turnarounds = turnaroundMatches.map(match => 'turnaround_time');
      entities[this.entityTypes.TURNAROUND_TIME] = turnarounds.length === 1 ? turnarounds[0] : turnarounds;
    }
    
    // Quantity Entities
    
    // Percentage patterns (e.g., 75%, 30 percent)
    const percentagePattern = /\b(\d+(?:\.\d+)?)(?:\s*%|\s+percent)\b/gi;
    const percentageMatches = [...query.matchAll(percentagePattern)];
    
    if (percentageMatches.length > 0) {
      const percentages = percentageMatches.map(match => parseFloat(match[1]) / 100);
      entities[this.entityTypes.PERCENTAGE] = percentages.length === 1 ? percentages[0] : percentages;
    }
    
    // Quantity patterns (e.g., 5 aircraft, 10 stands)
    const quantityPattern = /\b(\d+)\s+(aircraft|planes?|stands?|gates?|flights?|arrivals?|departures?|terminals?|piers?|positions?)\b/gi;
    const quantityMatches = [...query.matchAll(quantityPattern)];
    
    if (quantityMatches.length > 0) {
      const quantities = quantityMatches.map(match => {
        return {
          value: parseInt(match[1]),
          unit: match[2].toLowerCase().replace(/s$/, '') // Remove trailing 's' for singular form
        };
      });
      
      entities[this.entityTypes.QUANTITY] = quantities.length === 1 ? quantities[0] : quantities;
    }
    
    // Visualization Entities
    
    // Visualization type patterns (e.g., bar chart, line graph, table)
    const vizPattern = /\b(bar|line|pie|scatter|bubble|area|heat ?map|radar|gantt|table|chart|graph|plot|dashboard|report|visualization)\b/gi;
    const vizMatches = [...query.matchAll(vizPattern)];
    
    if (vizMatches.length > 0) {
      const vizTypes = vizMatches.map(match => {
        const type = match[1].toLowerCase().replace(/\s+/g, '');
        if (type === 'heatmap') return 'heatmap';
        if (type === 'bar' || type === 'line' || type === 'pie') return `${type}_chart`;
        if (type === 'chart' || type === 'graph' || type === 'plot') return 'chart';
        return type;
      });
      
      entities[this.entityTypes.VISUALIZATION_TYPE] = vizTypes.length === 1 ? vizTypes[0] : vizTypes;
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
  /**
   * Enhance the extracted entities with additional context and relationships
   * @private
   * @param {Object} entities - The extracted entities
   * @param {string} query - The original query
   * @param {string} intent - The identified intent
   * @param {Object} context - Processing context
   * @returns {Promise<void>}
   */
  async _enhanceEntitiesWithContext(entities, query, intent, context) {
    // Store the original query for reference
    if (!entities.originalQuery && query) {
      entities.originalQuery = query;
    }
    
    // Add time context if not present
    if (!entities[this.entityTypes.TIME_PERIOD] && 
        !entities[this.entityTypes.DATE] && 
        !entities[this.entityTypes.PEAK_PERIOD]) {
      
      // Check for common time references in the query
      if (query.includes('today') || query.includes('now') || query.includes('current')) {
        const today = new Date();
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        entities[this.entityTypes.TIME_PERIOD] = {
          type: 'day',
          start: today,
          end: todayEnd,
          expression: 'today',
          iso: {
            start: today.toISOString(),
            end: todayEnd.toISOString()
          }
        };
      } 
      else if (query.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(23, 59, 59, 999);
        
        entities[this.entityTypes.TIME_PERIOD] = {
          type: 'day',
          start: tomorrow,
          end: tomorrowEnd,
          expression: 'tomorrow',
          iso: {
            start: tomorrow.toISOString(),
            end: tomorrowEnd.toISOString()
          }
        };
      }
      else if (query.includes('yesterday')) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        
        entities[this.entityTypes.TIME_PERIOD] = {
          type: 'day',
          start: yesterday,
          end: yesterdayEnd,
          expression: 'yesterday',
          iso: {
            start: yesterday.toISOString(),
            end: yesterdayEnd.toISOString()
          }
        };
      }
      else if (query.includes('this week') || query.includes('current week')) {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
        endOfWeek.setHours(23, 59, 59, 999);
        
        entities[this.entityTypes.TIME_PERIOD] = {
          type: 'week',
          start: startOfWeek,
          end: endOfWeek,
          expression: 'this week',
          iso: {
            start: startOfWeek.toISOString(),
            end: endOfWeek.toISOString()
          }
        };
      }
      else if (query.includes('this month') || query.includes('current month')) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        
        entities[this.entityTypes.TIME_PERIOD] = {
          type: 'month',
          start: startOfMonth,
          end: endOfMonth,
          expression: 'this month',
          iso: {
            start: startOfMonth.toISOString(),
            end: endOfMonth.toISOString()
          }
        };
      }
      // If none of the above but we need a time frame, assume current day as default
      else if (this._intentRequiresTimeframe(intent)) {
        const today = new Date();
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        entities[this.entityTypes.TIME_PERIOD] = {
          type: 'day',
          start: today,
          end: todayEnd,
          expression: 'today (default)',
          iso: {
            start: today.toISOString(),
            end: todayEnd.toISOString()
          },
          isDefault: true
        };
      }
    }
    
    // Convert PEAK_PERIOD to TIME_PERIOD if needed
    if (entities[this.entityTypes.PEAK_PERIOD] && !entities[this.entityTypes.TIME_PERIOD]) {
      const peakPeriod = entities[this.entityTypes.PEAK_PERIOD];
      const today = new Date();
      
      if (typeof peakPeriod === 'string') {
        let startHour = 8; // Default
        let endHour = 20; // Default
        
        // Map common peak periods to hours
        if (peakPeriod.includes('morning')) {
          startHour = 7;
          endHour = 11;
        } else if (peakPeriod.includes('afternoon')) {
          startHour = 12;
          endHour = 17;
        } else if (peakPeriod.includes('evening')) {
          startHour = 17;
          endHour = 22;
        } else if (peakPeriod.includes('night') || peakPeriod.includes('overnight')) {
          startHour = 22;
          endHour = 6;
        } else if (peakPeriod.includes('peak')) {
          startHour = 8;
          endHour = 10;
        } else if (peakPeriod.includes('off-peak')) {
          startHour = 13;
          endHour = 16;
        }
        
        const start = new Date(today);
        start.setHours(startHour, 0, 0, 0);
        
        const end = new Date(today);
        end.setHours(endHour, 59, 59, 999);
        
        // Handle overnight periods
        if (startHour > endHour) {
          end.setDate(end.getDate() + 1);
        }
        
        entities[this.entityTypes.TIME_PERIOD] = {
          type: 'time_range',
          start: start,
          end: end,
          expression: peakPeriod,
          iso: {
            start: start.toISOString(),
            end: end.toISOString()
          },
          period_name: peakPeriod
        };
      }
    }
    
    // Map aircraft body type to category if needed
    if (entities[this.entityTypes.AIRCRAFT_BODY_TYPE] && !entities[this.entityTypes.AIRCRAFT_CATEGORY]) {
      const bodyType = entities[this.entityTypes.AIRCRAFT_BODY_TYPE];
      
      if (typeof bodyType === 'string') {
        // Map body types to categories
        const categoryMap = {
          'Narrowbody': 'C',
          'Widebody': 'E',
          'Regional': 'B'
        };
        
        if (categoryMap[bodyType]) {
          entities[this.entityTypes.AIRCRAFT_CATEGORY] = categoryMap[bodyType];
        }
      }
    }
    
    // Determine stand status for stand status queries
    if (intent === this.intents.STAND_STATUS_QUERY && !entities[this.entityTypes.MAINTENANCE_STATUS]) {
      // Check query for status indicators
      if (query.includes('available') || query.includes('free') || query.includes('open')) {
        entities[this.entityTypes.MAINTENANCE_STATUS] = 'available';
      } else if (query.includes('occupied') || query.includes('in use') || query.includes('busy')) {
        entities[this.entityTypes.MAINTENANCE_STATUS] = 'occupied';
      } else if (query.includes('maintenance') || query.includes('repair') || query.includes('closed')) {
        entities[this.entityTypes.MAINTENANCE_STATUS] = 'maintenance';
      }
    }
    
    // For maintenance queries, add status if not present
    if (intent === this.intents.MAINTENANCE_QUERY && !entities[this.entityTypes.MAINTENANCE_STATUS]) {
      if (query.includes('ongoing') || query.includes('current') || query.includes('active')) {
        entities[this.entityTypes.MAINTENANCE_STATUS] = 'in_progress';
      } else if (query.includes('planned') || query.includes('scheduled') || query.includes('future')) {
        entities[this.entityTypes.MAINTENANCE_STATUS] = 'scheduled';
      } else if (query.includes('completed') || query.includes('finished') || query.includes('past')) {
        entities[this.entityTypes.MAINTENANCE_STATUS] = 'completed';
      } else {
        // Default to all maintenance if not specified
        entities[this.entityTypes.MAINTENANCE_STATUS] = 'all';
      }
    }
    
    // For capacity queries, add metrics if not present
    if (intent === this.intents.CAPACITY_QUERY && !entities[this.entityTypes.CAPACITY_METRIC]) {
      if (query.includes('utilization') || query.includes('utilisation')) {
        entities[this.entityTypes.CAPACITY_METRIC] = 'utilization';
      } else if (query.includes('availability')) {
        entities[this.entityTypes.CAPACITY_METRIC] = 'availability';
      } else if (query.includes('occupancy')) {
        entities[this.entityTypes.CAPACITY_METRIC] = 'occupancy';
      } else if (query.includes('efficiency')) {
        entities[this.entityTypes.CAPACITY_METRIC] = 'efficiency';
      } else {
        // Default metric for capacity queries
        entities[this.entityTypes.CAPACITY_METRIC] = 'capacity';
      }
    }
    
    // For infrastructure queries, add detail level if not present
    if (intent === this.intents.INFRASTRUCTURE_QUERY) {
      if (query.includes('detail') || query.includes('detailed') || query.includes('comprehensive')) {
        entities.detail_level = 'detailed';
      } else if (query.includes('summary') || query.includes('brief')) {
        entities.detail_level = 'summary';
      } else {
        entities.detail_level = 'standard';
      }
    }
    
    // Add conversational context from previous queries if relevant
    if (context && context.previousEntities) {
      this._incorporatePreviousContext(entities, context.previousEntities, intent);
    }
    
    // Try to enhance entities with database data if available
    await this._enhanceEntitiesWithDatabaseInfo(entities);
  }
  
  /**
   * Checks if an intent typically requires a timeframe
   * @private
   * @param {string} intent - The intent to check
   * @returns {boolean} - Whether the intent requires a timeframe
   */
  _intentRequiresTimeframe(intent) {
    const timeframeIntents = [
      this.intents.CAPACITY_QUERY,
      this.intents.MAINTENANCE_QUERY,
      this.intents.STAND_STATUS_QUERY
    ];
    
    return timeframeIntents.includes(intent);
  }
  
  /**
   * Incorporate relevant entities from previous context
   * @private
   * @param {Object} entities - Current entities
   * @param {Object} previousEntities - Entities from previous queries
   * @param {string} intent - Current intent
   */
  _incorporatePreviousContext(entities, previousEntities, intent) {
    // Only incorporate certain entity types to avoid confusion
    const incorporableTypes = [
      this.entityTypes.TERMINAL,
      this.entityTypes.STAND,
      this.entityTypes.AIRCRAFT_TYPE,
      this.entityTypes.AIRLINE
    ];
    
    // Add missing entities from previous context if relevant to current intent
    for (const type of incorporableTypes) {
      if (!entities[type] && previousEntities[type]) {
        entities[type] = previousEntities[type];
        entities[`${type}_from_context`] = true; // Mark as from context
      }
    }
  }
  
  /**
   * Enhance entities with information from the database
   * @private
   * @param {Object} entities - The entities to enhance
   * @returns {Promise<void>}
   */
  async _enhanceEntitiesWithDatabaseInfo(entities) {
    try {
      // Make sure entity cache is loaded
      await this._loadEntityCacheData();
      
      // Enhance terminal information
      if (entities[this.entityTypes.TERMINAL] && this.entityCache.terminals) {
        const terminalCode = entities[this.entityTypes.TERMINAL];
        const matchedTerminal = this.entityCache.terminals.find(t => 
          t.code === terminalCode || t.name === terminalCode
        );
        
        if (matchedTerminal) {
          entities[`${this.entityTypes.TERMINAL}_info`] = {
            id: matchedTerminal.id,
            code: matchedTerminal.code,
            name: matchedTerminal.name
          };
        }
      }
      
      // Enhance stand information
      if (entities[this.entityTypes.STAND] && this.entityCache.stands) {
        const standCode = entities[this.entityTypes.STAND];
        const matchedStand = this.entityCache.stands.find(s => 
          s.name === standCode
        );
        
        if (matchedStand) {
          entities[`${this.entityTypes.STAND}_info`] = {
            id: matchedStand.id,
            name: matchedStand.name,
            terminalId: matchedStand.terminalId
          };
          
          // Add terminal info if not already present
          if (!entities[this.entityTypes.TERMINAL] && matchedStand.terminalId) {
            const matchedTerminal = this.entityCache.terminals.find(t => 
              t.id === matchedStand.terminalId
            );
            
            if (matchedTerminal) {
              entities[this.entityTypes.TERMINAL] = matchedTerminal.code;
              entities[`${this.entityTypes.TERMINAL}_info`] = {
                id: matchedTerminal.id,
                code: matchedTerminal.code,
                name: matchedTerminal.name
              };
              entities[`${this.entityTypes.TERMINAL}_inferred`] = true;
            }
          }
        }
      }
      
      // Enhance aircraft type information
      if (entities[this.entityTypes.AIRCRAFT_TYPE] && this.entityCache.aircraftTypes) {
        const aircraftCode = entities[this.entityTypes.AIRCRAFT_TYPE];
        const matchedAircraft = this.entityCache.aircraftTypes.find(a => 
          a.iataCode === aircraftCode || a.icaoCode === aircraftCode || a.name === aircraftCode
        );
        
        if (matchedAircraft) {
          entities[`${this.entityTypes.AIRCRAFT_TYPE}_info`] = {
            id: matchedAircraft.id,
            iataCode: matchedAircraft.iataCode,
            icaoCode: matchedAircraft.icaoCode,
            name: matchedAircraft.name
          };
        }
      }
      
      // Enhance airline information
      if (entities[this.entityTypes.AIRLINE] && this.entityCache.airlines) {
        const airlineCode = entities[this.entityTypes.AIRLINE];
        const matchedAirline = this.entityCache.airlines.find(a => 
          a.iataCode === airlineCode || a.name === airlineCode
        );
        
        if (matchedAirline) {
          entities[`${this.entityTypes.AIRLINE}_info`] = {
            id: matchedAirline.id,
            iataCode: matchedAirline.iataCode,
            name: matchedAirline.name
          };
        }
      }
    } catch (error) {
      logger.warn(`Error enhancing entities with database info: ${error.message}`);
      // Continue without database enhancement
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
    
    // Ensure entity cache is loaded for providing domain context
    await this._loadEntityCacheData();
    
    // Add domain-specific context to help with entity extraction and intent classification
    context.domain = {
      name: 'airport_capacity_planning',
      entityCounts: {
        terminals: (this.entityCache.terminals || []).length,
        stands: (this.entityCache.stands || []).length,
        piers: (this.entityCache.piers || []).length,
        aircraftTypes: (this.entityCache.aircraftTypes || []).length,
        airlines: (this.entityCache.airlines || []).length
      },
      // Add a sample of entities to help with context (limited to avoid token bloat)
      entitySamples: {
        terminals: (this.entityCache.terminals || []).slice(0, 5).map(t => t.code || t.name),
        stands: (this.entityCache.stands || []).slice(0, 5).map(s => s.name),
        aircraftTypes: (this.entityCache.aircraftTypes || []).slice(0, 5).map(a => a.iataCode || a.name)
      }
    };
    
    // Add conversation context if available
    if (options.conversationId) {
      try {
        // In a real implementation, you would retrieve conversation history from a database
        // For now, we'll just add the conversationId for reference
        context.conversationId = options.conversationId;
        // If conversation history is provided in options, add it to context
        if (options.conversationHistory && Array.isArray(options.conversationHistory)) {
          context.conversationHistory = options.conversationHistory;
        }
      } catch (error) {
        logger.warn(`Error retrieving conversation history: ${error.message}`);
      }
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
        this.entityCache.airlines &&
        this.entityCache.piers // Added check for piers
      ) {
        // Cache is still valid
        logger.debug('Using existing entity cache (not stale)');
        return;
      }
      
      logger.info('Loading entity cache data from database...');
      
      // Load terminals
      const terminals = await db('terminals').select('id', 'name', 'code');
      this.entityCache.terminals = terminals.map(t => ({
        id: t.id,
        name: t.name,
        code: t.code
      }));
      logger.debug(`Loaded ${terminals.length} terminals into cache`);
      
      // Load stands with more information (including stand type and active status)
      const stands = await db('stands').select('id', 'name', 'code', 'pier_id', 'terminal_id', 'stand_type', 'is_active', 'max_aircraft_size_code');
      this.entityCache.stands = stands.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        pierId: s.pier_id,
        terminalId: s.terminal_id,
        standType: s.stand_type,
        isActive: s.is_active,
        maxAircraftSize: s.max_aircraft_size_code
      }));
      logger.debug(`Loaded ${stands.length} stands into cache`);
      
      // Load piers
      const piers = await db('piers').select('id', 'name', 'code', 'terminal_id');
      this.entityCache.piers = piers.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        terminalId: p.terminal_id
      }));
      logger.debug(`Loaded ${piers.length} piers into cache`);
      
      // Load aircraft types with more information (including size categories and wingspan)
      const aircraftTypes = await db('aircraft_types')
        .select('id', 'iata_code', 'icao_code', 'name', 'manufacturer', 'model', 'wingspan_meters', 'length_meters', 'size_category_code');
      this.entityCache.aircraftTypes = aircraftTypes.map(a => ({
        id: a.id,
        iataCode: a.iata_code,
        icaoCode: a.icao_code,
        name: a.name,
        manufacturer: a.manufacturer,
        model: a.model,
        wingspan: a.wingspan_meters,
        length: a.length_meters,
        sizeCategory: a.size_category_code
      }));
      logger.debug(`Loaded ${aircraftTypes.length} aircraft types into cache`);
      
      // Load airlines
      const airlines = await airlineService.getAllAirlines();
      this.entityCache.airlines = airlines.map(a => ({
        id: a.id,
        name: a.name,
        iataCode: a.iata_code,
        icaoCode: a.icao_code
      }));
      logger.debug(`Loaded ${airlines.length} airlines into cache`);
      
      // Try to load ground handling agents if available
      try {
        const ghas = await db('ground_handling_agents').select('id', 'name', 'code');
        this.entityCache.groundHandlingAgents = ghas.map(g => ({
          id: g.id,
          name: g.name,
          code: g.code
        }));
        logger.debug(`Loaded ${ghas.length} ground handling agents into cache`);
      } catch (e) {
        logger.debug('Ground handling agents table not available or empty');
        this.entityCache.groundHandlingAgents = [];
      }
      
      // Update last updated timestamp
      this.entityCache.lastUpdated = now;
      
      logger.info('Entity cache data loaded successfully');
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