/**
 * Stub NLP Service
 * 
 * A simplified version of the NLP service for testing and development
 * that directly maps intents to services and methods.
 */

const logger = require('../../utils/logger');
const { ServiceLocator } = require('../../utils/di');
const openaiService = require('./OpenAIService');

class StubNLPService {
  constructor() {
    // Define intent constants
    this.intents = {
      CAPACITY_QUERY: 'capacity.query',
      MAINTENANCE_QUERY: 'maintenance.query',
      INFRASTRUCTURE_QUERY: 'infrastructure.query',
      STAND_STATUS_QUERY: 'stand.status',
      HELP_REQUEST: 'help.request',
      MAINTENANCE_CREATE: 'maintenance.create',
      MAINTENANCE_UPDATE: 'maintenance.update',
      CAPACITY_PARAMETER_UPDATE: 'capacity.parameter_update',
      AUTONOMOUS_SETTING: 'autonomous.setting',
      SCENARIO_CREATE: 'scenario.create',
      SCENARIO_MODIFY: 'scenario.modify'
    };
    
    this.isAvailable = true;
    
    // Initialize metrics
    this.metrics = {
      processedQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageConfidence: 0,
      totalConfidence: 0
    };
    
    logger.info('StubNLPService initialized');
  }

  /**
   * Process a query through the simplified NLP pipeline
   * @param {string} text - The query text
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - The processed query result
   */
  async processQuery(text, context = {}) {
    try {
      logger.debug(`Processing query with StubNLPService: ${text}`);
      this.metrics.processedQueries++;
      
      // First try the new implementation using extractIntentAndEntities
      try {
        const result = await this.extractIntentAndEntities(text, { context });
        
        if (result && result.intent) {
          // Update metrics
          this.metrics.totalConfidence += result.confidence || 0.7;
          this.metrics.averageConfidence = this.metrics.totalConfidence / this.metrics.processedQueries;
          this.metrics.successfulQueries++;
          
          logger.info(`Successfully extracted intent using new implementation: ${result.intent}`);
          
          // Convert from simplified intent format back to the legacy format
          // The legacy format uses intents.<NAME> (e.g., intents.CAPACITY_QUERY)
          // The new format uses snake_case (e.g., capacity_query)
          let legacyIntent;
          
          switch (result.intent) {
            case 'capacity_query':
              legacyIntent = this.intents.CAPACITY_QUERY;
              break;
            case 'maintenance_query':
              legacyIntent = this.intents.MAINTENANCE_QUERY;
              break;
            case 'infrastructure_query':
              legacyIntent = this.intents.INFRASTRUCTURE_QUERY;
              break;
            case 'stand_status_query':
              legacyIntent = this.intents.STAND_STATUS_QUERY;
              break;
            case 'help_request':
              legacyIntent = this.intents.HELP_REQUEST;
              break;
            default:
              legacyIntent = this.intents.CAPACITY_QUERY; // Default fallback
          }
          
          return {
            intent: legacyIntent,
            confidence: result.confidence || 0.7,
            entities: result.entities || { originalQuery: text }
          };
        }
      } catch (extractError) {
        logger.warn(`Error using extractIntentAndEntities, falling back to parseQuery: ${extractError.message}`);
      }
      
      // Fallback to the old implementation
      // Parse query to get intent and entities
      const { intent, confidence, entities } = this.parseQuery(text, context);
      
      // Update metrics
      this.metrics.totalConfidence += confidence;
      this.metrics.averageConfidence = this.metrics.totalConfidence / this.metrics.processedQueries;
      
      if (intent) {
        this.metrics.successfulQueries++;
        
        return {
          intent,
          confidence,
          entities: {
            ...entities,
            originalQuery: text
          }
        };
      } else {
        this.metrics.failedQueries++;
        
        return {
          intent: this.intents.CAPACITY_QUERY, // Default fallback
          confidence: 0.5,
          entities: {
            originalQuery: text
          }
        };
      }
    } catch (error) {
      logger.error(`Error processing query with StubNLPService: ${error.message}`);
      this.metrics.failedQueries++;
      
      // Return a default response to prevent errors
      return {
        intent: this.intents.CAPACITY_QUERY,
        confidence: 0.5,
        entities: {
          originalQuery: text
        }
      };
    }
  }

  /**
   * Parse query to extract intent and entities
   * @param {string} text - The query text
   * @param {Object} context - Additional context
   * @returns {Object} - Parsing result with intent and entities
   */
  parseQuery(text, context = {}) {
    const lowerText = text.toLowerCase();
    
    // Simple rule-based intent detection
    let intent = null;
    let confidence = 0.7; // Default medium confidence
    
    // Extract entities
    const entities = {
      originalQuery: text,
      preprocessedQuery: lowerText
    };
    
    // Extract terminal mentions
    const terminalMatch = lowerText.match(/terminal\s+(\w+)/i) || lowerText.match(/t(\d+)/i);
    if (terminalMatch) {
      entities.terminal = terminalMatch[0];
    }
    
    // Extract stand mentions
    const standMatch = lowerText.match(/stand\s+([a-z0-9]+)/i) || lowerText.match(/gate\s+([a-z0-9]+)/i);
    if (standMatch) {
      entities.stand = standMatch[1];
    }
    
    // Extract aircraft type mentions
    const aircraftMatch = lowerText.match(/aircraft\s+type\s+([a-z0-9]+)/i) || 
                         lowerText.match(/([ab][0-9]{3})/i);
    if (aircraftMatch) {
      entities.aircraft_type = aircraftMatch[1];
    }
    
    // Extract time period mentions
    const timeMatches = [
      { pattern: /today/i, value: 'today' },
      { pattern: /tomorrow/i, value: 'tomorrow' },
      { pattern: /next\s+week/i, value: 'next week' },
      { pattern: /this\s+month/i, value: 'this month' },
      { pattern: /morning/i, value: 'morning' },
      { pattern: /afternoon/i, value: 'afternoon' },
      { pattern: /evening/i, value: 'evening' },
      { pattern: /peak\s+hour/i, value: 'peak hour' },
      { pattern: /(january|february|march|april|may|june|july|august|september|october|november|december)/i, value: 'month' }
    ];
    
    for (const { pattern, value } of timeMatches) {
      if (pattern.test(lowerText)) {
        entities.time_period = value;
        break;
      }
    }
    
    // Detect intent based on keywords
    if (lowerText.includes('capacity') || lowerText.includes('utilization') || 
        lowerText.includes('utilisation') || lowerText.includes('availability')) {
      intent = this.intents.CAPACITY_QUERY;
      confidence = 0.85;
    } 
    else if (lowerText.includes('maintenance') || lowerText.includes('repair') || 
             lowerText.includes('fix') || lowerText.includes('broken')) {
      intent = this.intents.MAINTENANCE_QUERY;
      confidence = 0.85;
    }
    else if (lowerText.includes('terminal') || lowerText.includes('infrastructure') || 
             lowerText.includes('airport') || lowerText.includes('layout') || 
             lowerText.match(/t\d+/i)) {
      intent = this.intents.INFRASTRUCTURE_QUERY;
      confidence = 0.8;
    }
    else if (lowerText.includes('stand') || lowerText.includes('gate') || 
             lowerText.includes('status') || standMatch) {
      intent = this.intents.STAND_STATUS_QUERY;
      confidence = 0.8;
    }
    else if (lowerText.includes('help') || lowerText.includes('guide') ||
             lowerText.includes('how to') || lowerText.includes('what can you')) {
      intent = this.intents.HELP_REQUEST;
      confidence = 0.9;
    } 
    else {
      // If no clear intent, default to capacity query as fallback
      intent = this.intents.CAPACITY_QUERY;
      confidence = 0.6;
    }
    
    // Default to capacity query if no intent detected
    if (!intent) {
      intent = this.intents.CAPACITY_QUERY;
      confidence = 0.5;
    }
    
    return { intent, confidence, entities };
  }

  /**
   * Map intent to a service action
   * @param {string} intent - The detected intent
   * @returns {Object} - Mapping to service and method
   */
  mapIntentToAction(intent) {
    // Define mappings from intent to service/method
    const mappings = {
      [this.intents.CAPACITY_QUERY]: { 
        service: 'capacityService', 
        method: 'calculateCapacity'
      },
      [this.intents.MAINTENANCE_QUERY]: { 
        service: 'maintenanceService', 
        method: 'getScheduledMaintenance'
      },
      [this.intents.INFRASTRUCTURE_QUERY]: { 
        service: 'infrastructureService', 
        method: 'getInfrastructureInfo'
      },
      [this.intents.STAND_STATUS_QUERY]: { 
        service: 'standService', 
        method: 'getStandStatus'
      },
      [this.intents.HELP_REQUEST]: { 
        service: 'helpService', 
        method: 'getGeneralHelp'
      },
      [this.intents.MAINTENANCE_CREATE]: { 
        service: 'maintenanceService', 
        method: 'createMaintenanceRequest'
      },
      [this.intents.MAINTENANCE_UPDATE]: { 
        service: 'maintenanceService', 
        method: 'updateMaintenanceRequest'
      },
      [this.intents.CAPACITY_PARAMETER_UPDATE]: { 
        service: 'capacityService', 
        method: 'updateCapacityParameters'
      }
    };
    
    // Get the mapping or return default
    const mapping = mappings[intent];
    
    if (mapping) {
      return mapping;
    } else {
      // Default to help service if no mapping found
      logger.warn(`No action mapping found for intent: ${intent}`);
      return { 
        service: 'helpService', 
        method: 'getGeneralHelp'
      };
    }
  }

  /**
   * Process time expression into structured time information
   * @param {string} expression - Time expression
   * @returns {Object} - Structured time information
   */
  processTimeExpression(expression) {
    try {
      // Simple time expression processing
      const now = new Date();
      let start = new Date(now);
      let end = new Date(now);
      let type = 'unknown';
      
      const lowerExpression = expression.toLowerCase();
      
      if (lowerExpression === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        type = 'day';
      } 
      else if (lowerExpression === 'tomorrow') {
        start.setDate(start.getDate() + 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        end.setHours(23, 59, 59, 999);
        type = 'day';
      }
      else if (lowerExpression === 'next week') {
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() + (7 - dayOfWeek));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        type = 'week';
      }
      else if (lowerExpression === 'this month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of month
        end.setHours(23, 59, 59, 999);
        type = 'month';
      }
      else if (lowerExpression === 'morning') {
        start.setHours(6, 0, 0, 0);
        end.setHours(12, 0, 0, 0);
        type = 'part_of_day';
      }
      else if (lowerExpression === 'afternoon') {
        start.setHours(12, 0, 0, 0);
        end.setHours(18, 0, 0, 0);
        type = 'part_of_day';
      }
      else if (lowerExpression === 'evening') {
        start.setHours(18, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        type = 'part_of_day';
      }
      else if (lowerExpression === 'peak hour') {
        // Assume 8-9am is peak hour
        start.setHours(8, 0, 0, 0);
        end.setHours(9, 0, 0, 0);
        type = 'hour';
      }
      else {
        // Default to today
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        type = 'day';
      }
      
      return {
        type,
        start,
        end,
        expression: lowerExpression,
        iso: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      };
    } catch (error) {
      logger.error(`Error processing time expression: ${error.message}`);
      return {
        type: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get metrics from the NLP service
   * @returns {Object} - Service metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset service metrics
   */
  resetMetrics() {
    this.metrics = {
      processedQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageConfidence: 0,
      totalConfidence: 0
    };
  }
  
  /**
   * Extract intent and entities from a query using OpenAI
   * This is the method that the NLPService expects to be available
   * @param {string} query - User query to process
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Intent and entities extracted from the query
   */
  async extractIntentAndEntities(query, options = {}) {
    logger.info(`StubNLPService extractIntentAndEntities called for query: "${query}"`);
    
    // Use the parseQuery method to extract intent and entities
    const parseResult = this.parseQuery(query, options.context || {});
    
    // Create a time range from the time_period entity if available
    if (parseResult.entities.time_period) {
      const timeInfo = this.processTimeExpression(parseResult.entities.time_period);
      parseResult.entities.time_range = {
        start: timeInfo.iso.start.split('T')[0],
        end: timeInfo.iso.end.split('T')[0]
      };
    } else {
      // Default time range (this month)
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      parseResult.entities.time_range = {
        start: now.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0]
      };
    }
    
    // Convert from the intents.<NAME> format to the direct string intent name
    // expected by the ToolOrchestratorService
    const intentMap = {
      [this.intents.CAPACITY_QUERY]: 'capacity_query',
      [this.intents.MAINTENANCE_QUERY]: 'maintenance_query',
      [this.intents.INFRASTRUCTURE_QUERY]: 'infrastructure_query',
      [this.intents.STAND_STATUS_QUERY]: 'stand_status_query',
      [this.intents.HELP_REQUEST]: 'help_request'
    };
    
    const simplifiedIntent = intentMap[parseResult.intent] || 'unknown';
    logger.info(`Mapped intent ${parseResult.intent} to ${simplifiedIntent}`);
    
    return {
      intent: simplifiedIntent,
      entities: parseResult.entities,
      confidence: parseResult.confidence,
      reasoning: `StubNLPService identified intent based on keywords in query "${query}"`
    };
  }
  
  /**
   * Execute a tool based on the detected intent
   * @param {string} intent - The detected intent
   * @param {Object} entities - The extracted entities
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The tool execution result
   */
  async executeTool(intent, entities, options = {}) {
    logger.info(`Executing tool for intent: ${intent}`);
    
    // Map from intents to services and methods
    const toolMappings = {
      'capacity_query': {
        service: 'capacityService',
        method: 'calculateCapacity'
      },
      'maintenance_query': {
        service: 'maintenanceService',
        method: 'getScheduledMaintenance'
      },
      // Add other mappings as needed
    };
    
    const mapping = toolMappings[intent] || null;
    
    if (!mapping) {
      logger.warn(`No tool mapping found for intent: ${intent}`);
      return {
        success: false,
        message: 'I don\'t understand what you\'re asking for. Please try rephrasing your request.'
      };
    }
    
    // Get the service from the DI container
    const service = ServiceLocator.get(mapping.service);
    
    if (!service) {
      logger.error(`Service not found: ${mapping.service}`);
      return {
        success: false,
        message: `Sorry, the ${mapping.service} is not available right now.`
      };
    }
    
    if (!service[mapping.method]) {
      logger.error(`Method not found: ${mapping.method} in service ${mapping.service}`);
      return {
        success: false,
        message: `Sorry, I can't perform that operation right now.`
      };
    }
    
    try {
      // Call the service method with the entities
      const result = await service[mapping.method](entities);
      
      return {
        success: true,
        data: result,
        message: `Here's the ${intent.replace('_', ' ')} information you requested.`
      };
    } catch (error) {
      logger.error(`Error executing tool for intent ${intent}: ${error.message}`);
      return {
        success: false,
        message: `Sorry, I encountered an error: ${error.message}`
      };
    }
  }
}

module.exports = new StubNLPService();