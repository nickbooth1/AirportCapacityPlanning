/**
 * Intent Classifier Service
 * 
 * Enhanced service for classifying user intents with support for different
 * phrasing variations and improved accuracy. This service works with the
 * QueryVariationHandlerService to better understand user queries.
 */

const logger = require('../../utils/logger');
const OpenAIService = require('./OpenAIService');
const QueryVariationHandlerService = require('./QueryVariationHandlerService');

class IntentClassifierService {
  /**
   * Initialize intent classifier service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.openAIService = services.openAIService || OpenAIService;
    this.queryVariationHandler = services.queryVariationHandler || QueryVariationHandlerService;
    
    // Configure options
    this.options = {
      confidenceThreshold: options.confidenceThreshold || 0.7,
      usePatternMatching: options.usePatternMatching !== false,
      useLLMClassification: options.useLLMClassification !== false,
      enableFallbackIntents: options.enableFallbackIntents !== false,
      ...options
    };
    
    // Initialize intent patterns for rule-based matching
    this.intentPatterns = [
      // Capacity queries
      {
        intent: 'capacity_query',
        patterns: [
          /\b(show|display|get|what('s| is| are)|calculate) .*(capacity|utilization|usage|occupancy)\b/i,
          /\bcapacity .*(for|of|at|in)\b/i,
          /\b(how (many|much)|maximum) .*(aircraft|flights|stands) .*(capacity|handle|accommodate)\b/i,
          /\b(terminal|pier|airport) .*(capacity|utilization|usage)\b/i
        ],
        subTypes: [
          { name: 'capacity_overview', pattern: /\bcapacity overview\b/i },
          { name: 'capacity_forecast', pattern: /\bcapacity (forecast|prediction|projection|future)\b/i },
          { name: 'capacity_comparison', pattern: /\bcompar(e|ing|ison) .*(capacity|utilization)\b/i },
          { name: 'capacity_historical', pattern: /\b(historical|past|previous) capacity\b/i }
        ]
      },
      
      // Maintenance queries
      {
        intent: 'maintenance_query',
        patterns: [
          /\b(show|display|get|what('s| is| are)) .*(maintenance|repair|service|work|fix)\b/i,
          /\bmaintenance .*(status|schedule|plan|for|of|at|on|in)\b/i,
          /\b(stand|gate|terminal|pier) .*(under|in) maintenance\b/i,
          /\b(when|how long) .*(maintenance|repair|service)\b/i
        ],
        subTypes: [
          { name: 'maintenance_schedule', pattern: /\bmaintenance schedule\b/i },
          { name: 'maintenance_impact', pattern: /\bmaintenance .*(impact|effect|affect)\b/i },
          { name: 'maintenance_status', pattern: /\bmaintenance status\b/i },
          { name: 'maintenance_request', pattern: /\bmaintenance request\b/i }
        ]
      },
      
      // Infrastructure queries
      {
        intent: 'infrastructure_query',
        patterns: [
          /\b(show|display|get|what('s| is| are)) .*(terminal|pier|stand|gate|airport|infrastructure)\b/i,
          /\b(terminal|pier|stand|gate) .*(status|details|information|specs|overview|list)\b/i,
          /\b(how many|list|show) .*(terminal|pier|stand|gate)s?\b/i,
          /\b(where is|location of) .*(terminal|pier|stand|gate)\b/i
        ],
        subTypes: [
          { name: 'terminal_overview', pattern: /\bterminal .*(overview|details|information|about)\b/i },
          { name: 'stand_list', pattern: /\b(list|all) .*(stand|gate)s\b/i },
          { name: 'pier_details', pattern: /\bpier .*(details|information|about)\b/i },
          { name: 'infrastructure_map', pattern: /\b(map|layout|diagram) of\b/i }
        ]
      },
      
      // Stand status queries
      {
        intent: 'stand_status_query',
        patterns: [
          /\b(show|display|get|what('s| is| are)) .*(stand|gate) .*(status|availability|available|occupied|free|in use)\b/i,
          /\b(stand|gate) .*(availability|status|occupancy|utilization)\b/i,
          /\b(which|what) (stand|gate)s? .*(available|occupied|free|in use)\b/i,
          /\b(is|are) .*(stand|gate) .*(available|occupied|free|in use)\b/i
        ],
        subTypes: [
          { name: 'stand_availability', pattern: /\b(stand|gate) .*(availability|available|free)\b/i },
          { name: 'stand_occupancy', pattern: /\b(stand|gate) .*(occupied|in use|busy)\b/i },
          { name: 'stand_allocation', pattern: /\b(stand|gate) .*(allocation|assigned|allocated)\b/i },
          { name: 'stand_status_time', pattern: /\b(stand|gate) .*(at|during|for) .*(time|period|date|hour)\b/i }
        ]
      },
      
      // Scenario queries
      {
        intent: 'scenario_query',
        patterns: [
          /\b(show|display|get|what('s| is| are)) .*(scenario|simulation|model|what(-| )if)\b/i,
          /\bscenario .*(results|outcome|details|parameters|about)\b/i,
          /\b(create|run|execute|generate) .*(scenario|simulation|what(-| )if analysis)\b/i,
          /\b(compare|comparison between) .*(scenario|simulation|model)s?\b/i
        ],
        subTypes: [
          { name: 'scenario_details', pattern: /\bscenario .*(details|information|about)\b/i },
          { name: 'scenario_comparison', pattern: /\bcompar(e|ing|ison) .*(scenario|model)s\b/i },
          { name: 'scenario_creation', pattern: /\b(create|new|generate) scenario\b/i },
          { name: 'what_if_analysis', pattern: /\bwhat(-| )if (analysis|scenario)\b/i }
        ]
      },
      
      // Help requests
      {
        intent: 'help_request',
        patterns: [
          /\b(help|assist|support|guide)( me| us)?\b/i,
          /\b(how (to|do I|can I)|what can you) .*(use|query|ask|find|search)\b/i,
          /\b(what|which) .*(queries|questions|functions) .*(support|available|can I|possible)\b/i,
          /\bshow .*(functions|features|capabilities|options|commands)\b/i
        ],
        subTypes: [
          { name: 'general_help', pattern: /\b(help|assist)( me| us)?\b/i },
          { name: 'feature_help', pattern: /\bhelp .*(with|about|using) .*(feature|function|capability)\b/i },
          { name: 'query_help', pattern: /\bhow .*(ask|find|search|query)\b/i },
          { name: 'capabilities', pattern: /\bwhat .*(can you do|are your capabilities)\b/i }
        ]
      }
    ];
    
    // Initialize core intents list
    this.coreIntents = [
      'capacity_query',
      'maintenance_query',
      'infrastructure_query',
      'stand_status_query',
      'scenario_query',
      'help_request',
      'visualization_command',
      'clarification_request',
      'what_if_analysis',
      'complex_query',
      'unknown'
    ];
    
    // Initialize performance metrics
    this.metrics = {
      totalQueries: 0,
      patternMatched: 0,
      llmClassified: 0,
      fallbackUsed: 0,
      averageConfidence: 0,
      totalConfidence: 0,
      intentDistribution: {}
    };
    
    logger.info('Enhanced IntentClassifierService initialized');
  }

  /**
   * Classify the intent of a user query
   * 
   * @param {string} query - The user's query text
   * @param {Object} context - Additional context information
   * @returns {Promise<Object>} - Classification result with intent and confidence
   */
  async classifyIntent(query, context = {}) {
    if (!query || typeof query !== 'string') {
      return {
        intent: 'unknown',
        confidence: 0,
        error: 'Invalid query: must be a non-empty string'
      };
    }
    
    try {
      this.metrics.totalQueries++;
      
      // Step 1: Process query variations for better understanding
      const processedQuery = this.queryVariationHandler.processQuery(query);
      
      let normalizedQuery = query;
      let variationConfidence = 1.0;
      
      if (processedQuery.success) {
        normalizedQuery = processedQuery.normalizedQuery;
        variationConfidence = processedQuery.confidence || 1.0;
      }
      
      // Step 2: Try pattern matching first (faster) if enabled
      let result = null;
      if (this.options.usePatternMatching) {
        result = this._matchIntentPatterns(normalizedQuery);
        
        if (result.confidence >= this.options.confidenceThreshold) {
          this.metrics.patternMatched++;
          logger.debug(`Intent classified by pattern matching: ${result.intent} (${result.confidence.toFixed(2)})`);
          
          // Track intent distribution
          this._updateIntentMetrics(result.intent, result.confidence);
          
          return {
            ...result,
            method: 'pattern',
            originalQuery: query,
            normalizedQuery,
            variationProcessing: processedQuery.wasTransformed ? processedQuery.processingSteps : []
          };
        }
      }
      
      // Step 3: Use LLM classification if enabled
      if (this.options.useLLMClassification) {
        result = await this._classifyWithLLM(normalizedQuery, context);
        this.metrics.llmClassified++;
        
        // Combine LLM confidence with variation confidence
        result.confidence *= variationConfidence;
        
        logger.debug(`Intent classified by LLM: ${result.intent} (${result.confidence.toFixed(2)})`);
        
        // Track intent distribution
        this._updateIntentMetrics(result.intent, result.confidence);
        
        return {
          ...result,
          method: 'llm',
          originalQuery: query,
          normalizedQuery,
          variationProcessing: processedQuery.wasTransformed ? processedQuery.processingSteps : []
        };
      }
      
      // Step 4: Use pattern result as fallback if no other methods available
      if (result) {
        this.metrics.fallbackUsed++;
        
        // Combined with variation confidence
        result.confidence *= variationConfidence;
        
        // Track intent distribution
        this._updateIntentMetrics(result.intent, result.confidence);
        
        return {
          ...result,
          method: 'fallback',
          originalQuery: query,
          normalizedQuery,
          variationProcessing: processedQuery.wasTransformed ? processedQuery.processingSteps : [] 
        };
      }
      
      // Step 5: Last resort - unknown intent
      const unknownResult = {
        intent: 'unknown',
        confidence: 0.1 * variationConfidence,
        subType: null,
        method: 'default',
        originalQuery: query,
        normalizedQuery,
        variationProcessing: processedQuery.wasTransformed ? processedQuery.processingSteps : []
      };
      
      this._updateIntentMetrics(unknownResult.intent, unknownResult.confidence);
      return unknownResult;
      
    } catch (error) {
      logger.error(`Intent classification error: ${error.message}`);
      return {
        intent: 'unknown',
        confidence: 0,
        error: `Classification error: ${error.message}`,
        originalQuery: query
      };
    }
  }
  
  /**
   * Match query against predefined intent patterns
   * @private
   * @param {string} query - Normalized query text
   * @returns {Object} - Pattern matching result
   */
  _matchIntentPatterns(query) {
    // Default result if no patterns match
    let bestMatch = {
      intent: 'unknown',
      confidence: 0.1,
      subType: null
    };
    
    // Try each intent pattern
    for (const intentDef of this.intentPatterns) {
      // Check each pattern for this intent
      for (const pattern of intentDef.patterns) {
        const match = query.match(pattern);
        if (match) {
          // Calculate confidence based on match length relative to query length
          const coverage = match[0].length / query.length;
          const confidence = 0.6 + (coverage * 0.3);
          
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              intent: intentDef.intent,
              confidence,
              subType: null,
              patternMatch: match[0]
            };
            
            // Check for sub-type matches
            if (intentDef.subTypes) {
              for (const subType of intentDef.subTypes) {
                if (query.match(subType.pattern)) {
                  bestMatch.subType = subType.name;
                  bestMatch.confidence += 0.05; // Slight boost for subtype match
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Classify intent using LLM
   * @private
   * @param {string} query - Normalized query text
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - LLM classification result
   */
  async _classifyWithLLM(query, context = {}) {
    try {
      // Use OpenAI to classify the intent
      const result = await this.openAIService.classifyIntent(query, {
        availableIntents: this.getAvailableIntents(),
        sessionHistory: context.sessionHistory,
        previousIntent: context.previousIntent
      });
      
      // If no intent was found, default to unknown
      if (!result.intent || result.intent === '') {
        return {
          intent: 'unknown',
          confidence: 0.1,
          subType: null
        };
      }
      
      // If intent is not in our list of core intents, map to nearest or unknown
      if (!this.coreIntents.includes(result.intent)) {
        const mappedIntent = this._mapToNearestIntent(result.intent);
        return {
          intent: mappedIntent || 'unknown',
          confidence: result.confidence * 0.9, // Slightly reduce confidence for mapped intents
          subType: result.subType,
          originalIntent: result.intent
        };
      }
      
      return {
        intent: result.intent,
        confidence: result.confidence || 0.7,
        subType: result.subType,
        reasoning: result.reasoning
      };
    } catch (error) {
      logger.error(`LLM classification error: ${error.message}`);
      
      // Fallback to pattern matching on error
      const fallbackResult = this._matchIntentPatterns(query);
      return {
        ...fallbackResult,
        error: `LLM classification error: ${error.message}`
      };
    }
  }
  
  /**
   * Map an unknown intent to the nearest known intent
   * @private
   * @param {string} intent - The intent to map
   * @returns {string|null} - Mapped intent or null if no match
   */
  _mapToNearestIntent(intent) {
    // If intent contains these keywords, map to corresponding intent
    if (intent.includes('capacity')) return 'capacity_query';
    if (intent.includes('maintenance')) return 'maintenance_query';
    if (intent.includes('terminal') || intent.includes('infrastructure')) return 'infrastructure_query';
    if (intent.includes('stand') || intent.includes('gate')) return 'stand_status_query';
    if (intent.includes('scenario') || intent.includes('what if')) return 'scenario_query';
    if (intent.includes('help')) return 'help_request';
    if (intent.includes('visual') || intent.includes('chart') || intent.includes('graph')) return 'visualization_command';
    if (intent.includes('clarif') || intent.includes('question')) return 'clarification_request';
    
    // If no mapping found
    return null;
  }
  
  /**
   * Update metrics for intent distribution
   * @private
   * @param {string} intent - Classified intent
   * @param {number} confidence - Classification confidence
   */
  _updateIntentMetrics(intent, confidence) {
    // Update confidence metrics
    this.metrics.totalConfidence += confidence;
    this.metrics.averageConfidence = this.metrics.totalConfidence / this.metrics.totalQueries;
    
    // Update intent distribution
    if (!this.metrics.intentDistribution[intent]) {
      this.metrics.intentDistribution[intent] = {
        count: 0,
        avgConfidence: 0,
        totalConfidence: 0
      };
    }
    
    this.metrics.intentDistribution[intent].count++;
    this.metrics.intentDistribution[intent].totalConfidence += confidence;
    this.metrics.intentDistribution[intent].avgConfidence = 
      this.metrics.intentDistribution[intent].totalConfidence / 
      this.metrics.intentDistribution[intent].count;
  }
  
  /**
   * Get all available intents
   * @returns {Array<string>} - List of available intents
   */
  getAvailableIntents() {
    return this.coreIntents;
  }
  
  /**
   * Get detailed intent definitions with patterns
   * @returns {Array<Object>} - Intent definitions
   */
  getIntentDefinitions() {
    return this.intentPatterns;
  }
  
  /**
   * Add a new intent pattern
   * @param {string} intent - Intent name
   * @param {RegExp} pattern - Pattern to match
   * @param {Array<Object>} subTypes - Optional subtypes
   */
  addIntentPattern(intent, pattern, subTypes = []) {
    // Check if intent already exists
    const existingIntent = this.intentPatterns.find(i => i.intent === intent);
    
    if (existingIntent) {
      // Add pattern to existing intent
      existingIntent.patterns.push(pattern);
      
      // Add subtypes if provided
      if (subTypes && subTypes.length > 0) {
        existingIntent.subTypes = [
          ...(existingIntent.subTypes || []),
          ...subTypes
        ];
      }
      
      logger.info(`Added pattern to existing intent: ${intent}`);
    } else {
      // Create new intent
      this.intentPatterns.push({
        intent,
        patterns: [pattern],
        subTypes
      });
      
      // Add to core intents if not already there
      if (!this.coreIntents.includes(intent)) {
        this.coreIntents.push(intent);
      }
      
      logger.info(`Added new intent pattern: ${intent}`);
    }
  }
  
  /**
   * Update a configuration option
   * @param {Object} options - New configuration options
   */
  updateConfig(options) {
    this.options = {
      ...this.options,
      ...options
    };
    
    logger.info('IntentClassifierService configuration updated', this.options);
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
      patternMatched: 0,
      llmClassified: 0,
      fallbackUsed: 0,
      averageConfidence: 0,
      totalConfidence: 0,
      intentDistribution: {}
    };
    
    logger.info('IntentClassifierService metrics reset');
  }
}

module.exports = new IntentClassifierService();