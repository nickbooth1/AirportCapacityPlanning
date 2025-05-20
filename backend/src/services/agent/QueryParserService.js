/**
 * Query Parser Service
 * 
 * This service is responsible for parsing queries after intent classification
 * to extract entities, parameters, and structured data from user queries.
 * 
 * Enhanced features:
 * - Improved entity extraction with context awareness
 * - Support for complex nested entities
 * - Integration with IntentClassifierService and QueryVariationHandlerService
 * - Structured parameter extraction based on intent
 */

const logger = require('../../utils/logger');
const OpenAIService = require('./OpenAIService');
const IntentClassifierService = require('./IntentClassifierService');
const QueryVariationHandlerService = require('./QueryVariationHandlerService');

class QueryParserService {
  /**
   * Initialize query parser service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.openAIService = services.openAIService || OpenAIService;
    this.intentClassifier = services.intentClassifier || IntentClassifierService;
    this.queryVariationHandler = services.queryVariationHandler || QueryVariationHandlerService;
    
    // Configure options
    this.options = {
      entityConfidenceThreshold: options.entityConfidenceThreshold || 0.6,
      useContextualParsing: options.useContextualParsing !== false,
      enableEntityNormalization: options.enableEntityNormalization !== false,
      entityExtractionTimeout: options.entityExtractionTimeout || 5000,
      ...options
    };
    
    // Initialize entity definitions
    this.entityDefinitions = {
      // Infrastructure entities
      'terminal': {
        type: 'terminal',
        patterns: [
          /\bT(\d+)\b/i,
          /\bterminal (\d+|[A-Z])\b/i,
          /\b(north|south|east|west|international|domestic|main) terminal\b/i
        ],
        normalization: (value) => {
          // Convert T1 to Terminal 1, etc.
          if (/^T\d+$/i.test(value)) {
            return `Terminal ${value.substring(1)}`;
          }
          return value;
        }
      },
      'stand': {
        type: 'stand',
        patterns: [
          /\bstand ([A-Z]\d+)\b/i,
          /\bgate ([A-Z]\d+)\b/i,
          /\b([A-Z]\d+) (stand|gate)\b/i,
          /\bposition ([A-Z]\d+)\b/i
        ],
        normalization: (value) => {
          // Normalize 'Gate A1' to 'Stand A1'
          if (value.toLowerCase().startsWith('gate ')) {
            return `Stand ${value.substring(5)}`;
          }
          return value;
        }
      },
      'pier': {
        type: 'pier',
        patterns: [
          /\bpier ([A-Z]|\d+)\b/i,
          /\bconcourse ([A-Z]|\d+)\b/i,
          /\bsatellite ([A-Z]|\d+)\b/i
        ],
        normalization: (value) => {
          // Normalize 'Concourse A' to 'Pier A'
          if (value.toLowerCase().startsWith('concourse ')) {
            return `Pier ${value.substring(10)}`;
          } else if (value.toLowerCase().startsWith('satellite ')) {
            return `Pier ${value.substring(10)}`;
          }
          return value;
        }
      },
      
      // Time period entities
      'time_period': {
        type: 'time_period',
        patterns: [
          /\b(today|tomorrow|yesterday)\b/i,
          /\bnext (week|month|hour|day)\b/i,
          /\bthis (week|month|hour|day)\b/i,
          /\b(morning|afternoon|evening|night)\b/i,
          /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
          /\b(\d{1,2})(:|.)(\d{2}) (am|pm)\b/i,
          /\b(\d{1,2})(:|.)(\d{2})\b/i,
          /\b(\d{1,2}) (am|pm)\b/i
        ],
        normalization: (value) => {
          // Standard time periods don't need normalization
          return value;
        }
      },
      'date': {
        type: 'date',
        patterns: [
          /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/i,
          /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/i
        ],
        normalization: (value) => {
          // Try to convert to YYYY-MM-DD format if possible
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch (e) {
            // Skip normalization if date parsing fails
          }
          return value;
        }
      },
      
      // Capacity-related entities
      'capacity_metric': {
        type: 'capacity_metric',
        patterns: [
          /\b(hourly|daily|weekly|monthly) capacity\b/i,
          /\b(maximum|peak|average) capacity\b/i,
          /\bcapacity (utilization|usage|rate)\b/i,
          /\b(stand|gate) occupancy\b/i
        ],
        normalization: (value) => value
      },
      
      // Maintenance-related entities
      'maintenance_type': {
        type: 'maintenance_type',
        patterns: [
          /\b(scheduled|emergency|routine|preventive|corrective) maintenance\b/i,
          /\bmaintenance (request|work|task|job|order)\b/i
        ],
        normalization: (value) => value
      },
      
      // Aircraft-related entities
      'aircraft_type': {
        type: 'aircraft_type',
        patterns: [
          /\b(A320|A330|A350|A380|B737|B747|B777|B787)\b/i,
          /\b(narrow body|wide body)\b/i,
          /\b(regional|long haul)\b/i
        ],
        normalization: (value) => {
          // Normalize common aircraft types to standard format
          const normalizations = {
            'a320': 'A320',
            'a330': 'A330',
            'a350': 'A350',
            'a380': 'A380',
            'b737': 'B737',
            'b747': 'B747',
            'b777': 'B777',
            'b787': 'B787'
          };
          
          const normalized = normalizations[value.toLowerCase()];
          return normalized || value;
        }
      },
      
      // Airline-related entities
      'airline': {
        type: 'airline',
        patterns: [
          /\b(British Airways|Lufthansa|Emirates|Air France|KLM|Delta|United|American|Southwest)\b/i,
          /\b(BA|LH|EK|AF|KL|DL|UA|AA|WN)\b/
        ],
        normalization: (value) => {
          // Normalize airline codes to full names
          const airlineCodes = {
            'BA': 'British Airways',
            'LH': 'Lufthansa',
            'EK': 'Emirates',
            'AF': 'Air France',
            'KL': 'KLM',
            'DL': 'Delta',
            'UA': 'United',
            'AA': 'American Airlines',
            'WN': 'Southwest'
          };
          
          return airlineCodes[value] || value;
        }
      }
    };
    
    // Initialize intent-specific parameter schemas
    this.parameterSchemas = {
      'capacity_query': [
        { name: 'terminal', type: 'terminal', required: false },
        { name: 'time_period', type: 'time_period', required: false },
        { name: 'metric', type: 'capacity_metric', required: false },
        { name: 'aircraft_type', type: 'aircraft_type', required: false },
        { name: 'comparison', type: 'boolean', required: false },
        { name: 'breakdown', type: 'boolean', required: false }
      ],
      'maintenance_query': [
        { name: 'stand', type: 'stand', required: false },
        { name: 'terminal', type: 'terminal', required: false },
        { name: 'maintenance_type', type: 'maintenance_type', required: false },
        { name: 'time_period', type: 'time_period', required: false },
        { name: 'date', type: 'date', required: false },
        { name: 'impact_analysis', type: 'boolean', required: false }
      ],
      'infrastructure_query': [
        { name: 'terminal', type: 'terminal', required: false },
        { name: 'stand', type: 'stand', required: false },
        { name: 'pier', type: 'pier', required: false },
        { name: 'list_all', type: 'boolean', required: false },
        { name: 'details', type: 'boolean', required: false }
      ],
      'stand_status_query': [
        { name: 'stand', type: 'stand', required: false },
        { name: 'terminal', type: 'terminal', required: false },
        { name: 'time_period', type: 'time_period', required: false },
        { name: 'availability', type: 'boolean', required: false },
        { name: 'aircraft_type', type: 'aircraft_type', required: false }
      ],
      'scenario_query': [
        { name: 'scenario_name', type: 'string', required: false },
        { name: 'comparison', type: 'boolean', required: false },
        { name: 'what_if', type: 'boolean', required: false },
        { name: 'metric', type: 'capacity_metric', required: false }
      ]
    };
    
    // Initialize performance metrics
    this.metrics = {
      totalQueries: 0,
      successfulParses: 0,
      failedParses: 0,
      averageEntitiesPerQuery: 0,
      totalEntities: 0,
      patternMatchedEntities: 0,
      llmMatchedEntities: 0,
      entityTypeDistribution: {}
    };
    
    logger.info('Enhanced QueryParserService initialized');
  }

  /**
   * Parse a query to extract intent, entities, and parameters
   * 
   * @param {string} query - The user's query text
   * @param {Object} context - Additional context information
   * @returns {Promise<Object>} - Parsing result
   */
  async parseQuery(query, context = {}) {
    if (!query || typeof query !== 'string') {
      return {
        success: false,
        intent: 'unknown',
        entities: {},
        parameters: {},
        error: 'Invalid query: must be a non-empty string'
      };
    }
    
    try {
      this.metrics.totalQueries++;
      
      // Step 1: Process query variations for better understanding
      const processedQuery = this.queryVariationHandler.processQuery(query);
      
      let normalizedQuery = query;
      if (processedQuery.success) {
        normalizedQuery = processedQuery.normalizedQuery;
      }
      
      // Step 2: Classify intent
      const intentResult = await this.intentClassifier.classifyIntent(normalizedQuery, context);
      
      // Step 3: Extract entities based on intent
      const entitiesResult = await this._extractEntities(normalizedQuery, intentResult.intent, context);
      
      // Step 4: Process parameters based on intent schema
      const parametersResult = this._processParameters(
        intentResult.intent, 
        entitiesResult.entities, 
        context
      );
      
      // Update metrics
      this.metrics.successfulParses++;
      this.metrics.totalEntities += Object.keys(entitiesResult.entities).length;
      this.metrics.averageEntitiesPerQuery = this.metrics.totalEntities / this.metrics.totalQueries;
      
      // Track entity type distribution
      for (const entityType in entitiesResult.entities) {
        if (!this.metrics.entityTypeDistribution[entityType]) {
          this.metrics.entityTypeDistribution[entityType] = 0;
        }
        this.metrics.entityTypeDistribution[entityType]++;
      }
      
      logger.debug(`Query parsed: Intent=${intentResult.intent}, Entities=${Object.keys(entitiesResult.entities).length}, Parameters=${Object.keys(parametersResult.parameters).length}`);
      
      return {
        success: true,
        query,
        normalizedQuery,
        intent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        subType: intentResult.subType,
        entities: entitiesResult.entities,
        parameters: parametersResult.parameters,
        incomplete: parametersResult.incomplete,
        requiredParameters: parametersResult.requiredParameters,
        missingParameters: parametersResult.missingParameters,
        variationProcessing: processedQuery.success ? processedQuery.processingSteps : []
      };
    } catch (error) {
      this.metrics.failedParses++;
      logger.error(`Error parsing query: ${error.message}`);
      
      return {
        success: false,
        query,
        intent: 'unknown',
        entities: {},
        parameters: {},
        error: `Parsing error: ${error.message}`
      };
    }
  }
  
  /**
   * Extract entities from a query based on intent
   * @private
   * @param {string} query - The normalized query text
   * @param {string} intent - The classified intent
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Extracted entities
   */
  async _extractEntities(query, intent, context = {}) {
    try {
      // Step 1: Use pattern matching for basic entity extraction
      const patternEntities = this._extractEntitiesWithPatterns(query);
      
      // Track pattern matched entities
      this.metrics.patternMatchedEntities += Object.keys(patternEntities).length;
      
      // Step 2: Use LLM for more complex entity extraction
      const llmEntities = await this._extractEntitiesWithLLM(
        query, 
        intent, 
        patternEntities,
        context
      );
      
      // Track LLM matched entities
      this.metrics.llmMatchedEntities += Object.keys(llmEntities).filter(
        key => !patternEntities[key]
      ).length;
      
      // Step 3: Merge and normalize entities
      const mergedEntities = { ...patternEntities, ...llmEntities };
      const normalizedEntities = this._normalizeEntities(mergedEntities);
      
      // Step 4: Apply contextual enhancement if enabled
      let enhancedEntities = normalizedEntities;
      if (this.options.useContextualParsing && context.session) {
        enhancedEntities = this._enhanceWithContext(
          normalizedEntities,
          context,
          intent
        );
      }
      
      return { 
        entities: enhancedEntities,
        patternMatched: Object.keys(patternEntities).length,
        llmMatched: Object.keys(llmEntities).filter(key => !patternEntities[key]).length
      };
    } catch (error) {
      logger.error(`Entity extraction error: ${error.message}`);
      return { 
        entities: {}, 
        error: `Entity extraction error: ${error.message}`
      };
    }
  }
  
  /**
   * Extract entities using pattern matching
   * @private
   * @param {string} query - The normalized query text
   * @returns {Object} - Extracted entities
   */
  _extractEntitiesWithPatterns(query) {
    const entities = {};
    
    // Try each entity definition
    for (const [entityName, definition] of Object.entries(this.entityDefinitions)) {
      for (const pattern of definition.patterns) {
        const match = query.match(pattern);
        if (match) {
          // Extract the entity value
          let value = match[0];
          
          // If there's a capture group, use that instead of the full match
          if (match.length > 1 && match[1]) {
            value = match[1];
          }
          
          // Store the entity
          entities[definition.type] = value;
          break;
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Extract entities using LLM
   * @private
   * @param {string} query - The normalized query text
   * @param {string} intent - The classified intent
   * @param {Object} patternEntities - Entities already found by pattern matching
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Extracted entities
   */
  async _extractEntitiesWithLLM(query, intent, patternEntities, context = {}) {
    // Create a set of parameters we're interested in based on intent
    const targetParameters = this.parameterSchemas[intent] || [];
    
    // Identify entity types we need that weren't found by pattern matching
    const missingEntityTypes = targetParameters
      .filter(param => !patternEntities[param.type])
      .map(param => param.type);
    
    // If no missing entities, skip LLM extraction
    if (missingEntityTypes.length === 0) {
      return {};
    }
    
    try {
      // Call OpenAI to extract entities
      const result = await this.openAIService.extractEntities(
        query,
        {
          intent,
          targetEntityTypes: missingEntityTypes,
          existingEntities: patternEntities,
          sessionContext: context.session
        },
        { timeout: this.options.entityExtractionTimeout }
      );
      
      // Filter entities that meet confidence threshold
      const validEntities = {};
      for (const [entityType, entityInfo] of Object.entries(result.entities || {})) {
        if (entityInfo.confidence >= this.options.entityConfidenceThreshold) {
          validEntities[entityType] = entityInfo.value;
        }
      }
      
      return validEntities;
    } catch (error) {
      logger.error(`LLM entity extraction error: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Process extracted entities into parameters based on intent
   * @private
   * @param {string} intent - The classified intent
   * @param {Object} entities - Extracted entities
   * @param {Object} context - Additional context
   * @returns {Object} - Processed parameters
   */
  _processParameters(intent, entities, context = {}) {
    // Get the parameter schema for this intent
    const schema = this.parameterSchemas[intent] || [];
    
    // Initialize parameters object
    const parameters = {};
    
    // Track required parameters
    const requiredParameters = schema
      .filter(param => param.required)
      .map(param => param.name);
    
    const missingParameters = [];
    
    // Process each parameter in the schema
    for (const param of schema) {
      // Check if we have an entity that matches this parameter's type
      if (entities[param.type]) {
        parameters[param.name] = entities[param.type];
      } 
      // Check if this parameter is marked as a boolean flag
      else if (param.type === 'boolean') {
        // Look for keywords that would indicate this flag is true
        const positiveRegex = new RegExp(`\\b(${param.name}|${param.name.replace('_', ' ')})\\b`, 'i');
        parameters[param.name] = positiveRegex.test(context.normalizedQuery || '');
      }
      // If required parameter is missing, add to missing list
      else if (param.required) {
        missingParameters.push(param.name);
      }
    }
    
    // Add additional calculated parameters
    if (intent === 'capacity_query') {
      // Add a historical flag if time period is in the past
      if (entities.time_period && /\b(yesterday|last|previous|past)\b/i.test(entities.time_period)) {
        parameters.historical = true;
      }
    }
    
    return {
      parameters,
      requiredParameters,
      missingParameters,
      incomplete: missingParameters.length > 0
    };
  }
  
  /**
   * Normalize extracted entities using defined normalizers
   * @private
   * @param {Object} entities - Raw extracted entities
   * @returns {Object} - Normalized entities
   */
  _normalizeEntities(entities) {
    if (!this.options.enableEntityNormalization) {
      return entities;
    }
    
    const normalized = {};
    
    for (const [entityType, value] of Object.entries(entities)) {
      // Find the entity definition
      const definition = Object.values(this.entityDefinitions)
        .find(def => def.type === entityType);
      
      if (definition && typeof definition.normalization === 'function') {
        // Apply normalization function
        normalized[entityType] = definition.normalization(value);
      } else {
        // Keep original value
        normalized[entityType] = value;
      }
    }
    
    return normalized;
  }
  
  /**
   * Enhance entities using context from previous interactions
   * @private
   * @param {Object} entities - Normalized entities
   * @param {Object} context - Session context
   * @param {string} intent - Classified intent
   * @returns {Object} - Enhanced entities
   */
  _enhanceWithContext(entities, context, intent) {
    // If no session context, return original entities
    if (!context.session) {
      return entities;
    }
    
    const enhanced = { ...entities };
    
    // Get previous entities from session
    const previousEntities = context.session.recentEntities || [];
    
    // Look for entities that might be referenced implicitly
    if (intent === 'capacity_query' && !enhanced.terminal && context.session.lastTerminal) {
      // If query is about capacity and no terminal specified, use the last mentioned terminal
      enhanced.terminal = context.session.lastTerminal;
      enhanced._contextual = enhanced._contextual || {};
      enhanced._contextual.terminal = true;
    }
    
    if (intent === 'maintenance_query' && !enhanced.stand && context.session.lastStand) {
      // If query is about maintenance and no stand specified, use the last mentioned stand
      enhanced.stand = context.session.lastStand;
      enhanced._contextual = enhanced._contextual || {};
      enhanced._contextual.stand = true;
    }
    
    return enhanced;
  }
  
  /**
   * Get available entity types
   * @returns {Array<string>} - Available entity types
   */
  getAvailableEntityTypes() {
    return Object.values(this.entityDefinitions).map(def => def.type);
  }
  
  /**
   * Get parameter schema for an intent
   * @param {string} intent - Intent name
   * @returns {Array<Object>} - Parameter schema
   */
  getParameterSchema(intent) {
    return this.parameterSchemas[intent] || [];
  }
  
  /**
   * Add a new entity definition
   * @param {string} name - Entity name
   * @param {string} type - Entity type
   * @param {Array<RegExp>} patterns - Patterns to match
   * @param {Function} normalization - Normalization function
   */
  addEntityDefinition(name, type, patterns, normalization) {
    if (!name || !type || !patterns) {
      throw new Error('Entity definition requires name, type, and patterns');
    }
    
    this.entityDefinitions[name] = {
      type,
      patterns,
      normalization: normalization || (value => value)
    };
    
    logger.info(`Added entity definition: ${name} (${type})`);
  }
  
  /**
   * Update parameter schema for an intent
   * @param {string} intent - Intent name
   * @param {Array<Object>} schema - Parameter schema
   */
  updateParameterSchema(intent, schema) {
    if (!intent || !Array.isArray(schema)) {
      throw new Error('Intent and schema array are required');
    }
    
    this.parameterSchemas[intent] = schema;
    logger.info(`Updated parameter schema for intent: ${intent}`);
  }
  
  /**
   * Update configuration options
   * @param {Object} options - Configuration options
   */
  updateConfig(options) {
    this.options = {
      ...this.options,
      ...options
    };
    
    logger.info('QueryParserService configuration updated', this.options);
  }
  
  /**
   * Get current performance metrics
   * @returns {Object} - Performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      successfulParses: 0,
      failedParses: 0,
      averageEntitiesPerQuery: 0,
      totalEntities: 0,
      patternMatchedEntities: 0,
      llmMatchedEntities: 0,
      entityTypeDistribution: {}
    };
    
    logger.info('QueryParserService metrics reset');
  }
}

module.exports = new QueryParserService();