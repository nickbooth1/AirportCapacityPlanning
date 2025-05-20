/**
 * Query Disambiguation Service
 * 
 * This service detects and resolves ambiguous queries by providing clarification options
 * to the user and processing their selections. It integrates with the query understanding
 * system to improve accuracy for unclear or ambiguous user queries.
 * 
 * Features:
 * - Detection of ambiguous intent or entities
 * - Generation of clarification options
 * - Processing of disambiguation responses
 * - Tracking disambiguation interactions for learning
 */

const logger = require('../../utils/logger');
const OpenAIService = require('./OpenAIService');
const WorkingMemoryService = require('./WorkingMemoryService');

class QueryDisambiguationService {
  /**
   * Initialize the disambiguation service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options 
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.openAIService = services.openAIService || OpenAIService;
    this.workingMemoryService = services.workingMemoryService || new WorkingMemoryService();
    
    // Configure options
    this.options = {
      intentConfidenceThreshold: options.intentConfidenceThreshold || 0.7,
      entityConfidenceThreshold: options.entityConfidenceThreshold || 0.6,
      maxDisambiguationOptions: options.maxDisambiguationOptions || 3,
      storeDisambiguationHistory: options.storeDisambiguationHistory !== false,
      ...options
    };
    
    // Initialize logger
    this.logger = services.logger || logger;
    
    // Common ambiguity patterns by category
    this.ambiguityPatterns = {
      // Intent ambiguity patterns
      intent: [
        { pattern: /show|display|list/, options: ['view data', 'visualize data', 'export data'] },
        { pattern: /status|condition/, options: ['current status', 'historical status', 'status forecast'] },
        { pattern: /maintenance|repair/, options: ['view maintenance', 'schedule maintenance', 'maintenance impact'] },
        { pattern: /capacity|throughput/, options: ['view capacity', 'analyze capacity', 'capacity forecast'] }
      ],
      
      // Entity ambiguity patterns
      entity: {
        terminal: {
          pattern: /terminal|terminals/,
          missingDetails: true,
          clarificationPrompt: 'Which terminal do you want information about?'
        },
        stand: {
          pattern: /stand|gate|position/,
          missingDetails: true,
          clarificationPrompt: 'Which stand are you referring to?'
        },
        time_period: {
          pattern: /when|time|period|during/,
          missingDetails: true,
          clarificationPrompt: 'For what time period?'
        }
      },
      
      // Relationship ambiguity patterns
      relationship: [
        { pattern: /between|relationship|correlation/, clarificationPrompt: 'What specific relationship are you interested in?' },
        { pattern: /impact|affect|effect/, clarificationPrompt: 'What type of impact are you interested in?' },
        { pattern: /compare|comparison/, clarificationPrompt: 'What specific comparison would you like to see?' }
      ]
    };
    
    // Initialize metrics
    this.metrics = {
      totalAmbiguousQueries: 0,
      totalDisambiguationInteractions: 0,
      intentAmbiguities: 0,
      entityAmbiguities: 0,
      relationshipAmbiguities: 0,
      successfulDisambiguations: 0,
      failedDisambiguations: 0,
      averageOptionsPresented: 0,
      totalOptionsPresented: 0
    };
    
    this.logger.info('QueryDisambiguationService initialized');
  }

  /**
   * Check if a query is ambiguous and needs disambiguation
   * 
   * @param {Object} parsedQuery - Parsed query with intent and entities
   * @param {Object} context - Session context
   * @returns {Promise<Object>} - Ambiguity check result
   */
  async checkAmbiguity(parsedQuery, context = {}) {
    try {
      if (!parsedQuery) {
        return { isAmbiguous: false };
      }
      
      const ambiguities = [];
      
      // Check intent ambiguity
      if (this._checkIntentAmbiguity(parsedQuery, context)) {
        ambiguities.push({
          type: 'intent',
          message: 'Your query could be interpreted in multiple ways',
          options: await this._generateIntentOptions(parsedQuery, context)
        });
      }
      
      // Check entity ambiguities
      const entityAmbiguities = this._checkEntityAmbiguities(parsedQuery, context);
      if (entityAmbiguities.length > 0) {
        ambiguities.push(...entityAmbiguities);
      }
      
      // Check relationship ambiguities
      if (this._checkRelationshipAmbiguity(parsedQuery, context)) {
        ambiguities.push({
          type: 'relationship',
          message: 'Please clarify the specific relationship you\'re interested in',
          options: await this._generateRelationshipOptions(parsedQuery, context)
        });
      }
      
      // Update metrics
      if (ambiguities.length > 0) {
        this.metrics.totalAmbiguousQueries++;
        
        // Count by ambiguity type
        for (const ambiguity of ambiguities) {
          if (ambiguity.type === 'intent') this.metrics.intentAmbiguities++;
          else if (ambiguity.type === 'entity') this.metrics.entityAmbiguities++;
          else if (ambiguity.type === 'relationship') this.metrics.relationshipAmbiguities++;
        }
        
        // Update options metrics
        let totalOptions = 0;
        for (const ambiguity of ambiguities) {
          totalOptions += ambiguity.options?.length || 0;
        }
        this.metrics.totalOptionsPresented += totalOptions;
        this.metrics.averageOptionsPresented = this.metrics.totalOptionsPresented / this.metrics.totalAmbiguousQueries;
      }
      
      // Store disambiguation data if enabled
      if (ambiguities.length > 0 && this.options.storeDisambiguationHistory && context.sessionId) {
        await this._storeDisambiguationRequest(parsedQuery, ambiguities, context);
      }
      
      return {
        isAmbiguous: ambiguities.length > 0,
        ambiguities,
        requiresDisambiguation: ambiguities.length > 0,
        originalQuery: parsedQuery
      };
    } catch (error) {
      this.logger.error(`Error checking query ambiguity: ${error.message}`);
      return { isAmbiguous: false };
    }
  }
  
  /**
   * Process a disambiguation response from the user
   * 
   * @param {Object} disambiguationData - Original disambiguation data
   * @param {Object} userResponse - User's selection/clarification
   * @param {Object} context - Session context
   * @returns {Promise<Object>} - Clarified query
   */
  async processDisambiguation(disambiguationData, userResponse, context = {}) {
    try {
      this.metrics.totalDisambiguationInteractions++;
      
      if (!disambiguationData || !disambiguationData.ambiguities || disambiguationData.ambiguities.length === 0) {
        this.metrics.failedDisambiguations++;
        return {
          success: false,
          error: 'No disambiguation data available'
        };
      }
      
      // Extract original query and ambiguities
      const originalQuery = disambiguationData.originalQuery;
      const ambiguities = disambiguationData.ambiguities;
      
      // Process each ambiguity type
      const clarifiedQuery = { ...originalQuery };
      let allAmbiguitiesResolved = true;
      
      for (const ambiguity of ambiguities) {
        if (userResponse[ambiguity.type]) {
          const selection = userResponse[ambiguity.type];
          
          switch (ambiguity.type) {
            case 'intent':
              // Update intent based on user selection
              if (selection.intent) {
                clarifiedQuery.intent = selection.intent;
                clarifiedQuery.intentConfidence = 1.0; // User confirmed
              } else {
                allAmbiguitiesResolved = false;
              }
              break;
              
            case 'entity':
              // Add or update entity based on user selection
              if (selection.entityType && selection.entityValue) {
                clarifiedQuery.entities = {
                  ...clarifiedQuery.entities,
                  [selection.entityType]: selection.entityValue
                };
              } else {
                allAmbiguitiesResolved = false;
              }
              break;
              
            case 'relationship':
              // Update relationship specification
              if (selection.relationship) {
                clarifiedQuery.relationship = selection.relationship;
                
                // Also update intent if relationship implies a specific intent
                if (selection.impliedIntent) {
                  clarifiedQuery.intent = selection.impliedIntent;
                  clarifiedQuery.intentConfidence = 0.9;
                }
              } else {
                allAmbiguitiesResolved = false;
              }
              break;
              
            default:
              // Unknown ambiguity type
              allAmbiguitiesResolved = false;
          }
        } else {
          // This ambiguity wasn't addressed in the response
          allAmbiguitiesResolved = false;
        }
      }
      
      // Store disambiguation result if enabled
      if (this.options.storeDisambiguationHistory && context.sessionId) {
        await this._storeDisambiguationResult(
          disambiguationData,
          userResponse,
          clarifiedQuery,
          context
        );
      }
      
      // Update metrics
      if (allAmbiguitiesResolved) {
        this.metrics.successfulDisambiguations++;
      } else {
        this.metrics.failedDisambiguations++;
      }
      
      return {
        success: true,
        clarifiedQuery,
        allAmbiguitiesResolved,
        needsFurtherDisambiguation: !allAmbiguitiesResolved,
        remainingAmbiguities: !allAmbiguitiesResolved ? 
          ambiguities.filter(a => !userResponse[a.type]) : []
      };
    } catch (error) {
      this.logger.error(`Error processing disambiguation: ${error.message}`);
      this.metrics.failedDisambiguations++;
      
      return {
        success: false,
        error: `Disambiguation error: ${error.message}`
      };
    }
  }
  
  /**
   * Generate disambiguation options using LLM for custom responses
   * 
   * @param {Object} parsedQuery - Original parsed query
   * @param {string} ambiguityType - Type of ambiguity (intent, entity, relationship)
   * @param {Object} context - Session context
   * @returns {Promise<Array>} - Disambiguation options
   */
  async generateDisambiguationOptions(parsedQuery, ambiguityType, context = {}) {
    try {
      // Prepare prompt based on ambiguity type
      let prompt;
      
      switch (ambiguityType) {
        case 'intent':
          prompt = `
          Generate ${this.options.maxDisambiguationOptions} different interpretations for this ambiguous query:
          "${parsedQuery.originalQuery || parsedQuery.query}"
          
          Each interpretation should include:
          1. A clear explanation of this interpretation
          2. A specific intent label
          3. A follow-up question the system should ask
          
          Format as a JSON array where each object has:
          - description: Brief explanation of this interpretation
          - intent: A specific intent label
          - followUpQuestion: Question to clarify this interpretation
          `;
          break;
          
        case 'entity':
          // Get missing entity types
          const missingEntityTypes = this._findMissingEntities(parsedQuery, context);
          
          prompt = `
          Generate ${this.options.maxDisambiguationOptions} options for the following missing entity types in this query:
          "${parsedQuery.originalQuery || parsedQuery.query}"
          
          Missing entity types: ${missingEntityTypes.join(', ')}
          
          For each entity type, provide:
          1. Most likely values based on the query context
          2. Clear descriptions for each option
          
          Format as a JSON array where each object has:
          - entityType: One of the missing entity types
          - options: Array of possible values with their descriptions
          `;
          break;
          
        case 'relationship':
          prompt = `
          Generate ${this.options.maxDisambiguationOptions} possible relationship interpretations for this query:
          "${parsedQuery.originalQuery || parsedQuery.query}"
          
          For each relationship interpretation, include:
          1. What is being related to what
          2. The nature of the relationship (causal, correlational, etc.)
          3. A specific question to clarify this relationship
          
          Format as a JSON array where each object has:
          - relationshipType: Type of relationship (e.g., "impact", "correlation")
          - description: Clear description of this relationship interpretation
          - clarificationQuestion: Question to ask to confirm this interpretation
          - impliedIntent: What intent this relationship implies
          `;
          break;
          
        default:
          prompt = `
          Generate ${this.options.maxDisambiguationOptions} clarification options for this ambiguous query:
          "${parsedQuery.originalQuery || parsedQuery.query}"
          
          For each option, include:
          1. A clear description of this interpretation
          2. A follow-up question to clarify
          
          Format as a JSON array where each object has:
          - description: Brief description of this interpretation
          - clarificationQuestion: Question to ask to confirm this interpretation
          `;
      }
      
      // Generate options using OpenAI
      const response = await this.openAIService.processQuery(prompt);
      
      // Parse the response to extract options
      try {
        const jsonMatch = response.text.match(/\[\s*{[\s\S]*}\s*\]/);
        if (jsonMatch) {
          const options = JSON.parse(jsonMatch[0]);
          return options.slice(0, this.options.maxDisambiguationOptions);
        }
      } catch (parseError) {
        this.logger.warn(`Failed to parse disambiguation options: ${parseError.message}`);
      }
      
      // Fallback to pattern-based options if LLM fails
      return await this._getDefaultOptions(parsedQuery, ambiguityType, context);
    } catch (error) {
      this.logger.error(`Error generating disambiguation options: ${error.message}`);
      return await this._getDefaultOptions(parsedQuery, ambiguityType, context);
    }
  }
  
  /**
   * Check if intent is ambiguous
   * @private
   * @param {Object} parsedQuery - Parsed query
   * @param {Object} context - Session context
   * @returns {boolean} - Whether intent is ambiguous
   */
  _checkIntentAmbiguity(parsedQuery, context) {
    // Check if intent confidence is below threshold
    if (parsedQuery.intentConfidence && 
        parsedQuery.intentConfidence < this.options.intentConfidenceThreshold) {
      return true;
    }
    
    // Check for multiple possible intents
    if (parsedQuery.possibleIntents && 
        parsedQuery.possibleIntents.length > 1 &&
        parsedQuery.possibleIntents[0].confidence - parsedQuery.possibleIntents[1].confidence < 0.2) {
      return true;
    }
    
    // Check for intent keywords overlap (e.g., "show maintenance capacity")
    const query = parsedQuery.originalQuery || parsedQuery.query || '';
    let matchCount = 0;
    
    for (const pattern of this.ambiguityPatterns.intent) {
      if (pattern.pattern.test(query)) {
        matchCount++;
      }
      
      if (matchCount >= 2) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check for entity ambiguities
   * @private
   * @param {Object} parsedQuery - Parsed query
   * @param {Object} context - Session context
   * @returns {Array} - Entity ambiguities
   */
  _checkEntityAmbiguities(parsedQuery, context) {
    const ambiguities = [];
    const query = parsedQuery.originalQuery || parsedQuery.query || '';
    
    // Check for required entities that are missing
    for (const [entityType, entityPattern] of Object.entries(this.ambiguityPatterns.entity)) {
      if (entityPattern.pattern.test(query) && entityPattern.missingDetails) {
        // If the entity type is mentioned but no specific entity is provided
        if (!parsedQuery.entities || !parsedQuery.entities[entityType]) {
          ambiguities.push({
            type: 'entity',
            entityType,
            message: entityPattern.clarificationPrompt || `Please specify which ${entityType}`,
            options: []  // Will be filled in by generateDisambiguationOptions
          });
        }
      }
    }
    
    // Check for low confidence entities
    if (parsedQuery.entities) {
      for (const [entityType, entityValue] of Object.entries(parsedQuery.entities)) {
        if (parsedQuery.entityConfidence && 
            parsedQuery.entityConfidence[entityType] &&
            parsedQuery.entityConfidence[entityType] < this.options.entityConfidenceThreshold) {
          ambiguities.push({
            type: 'entity',
            entityType,
            message: `Did you mean ${entityValue} for ${entityType}?`,
            options: []  // Will be filled in by generateDisambiguationOptions
          });
        }
      }
    }
    
    // Fill in options for each entity ambiguity
    return ambiguities;
  }
  
  /**
   * Check for relationship ambiguities
   * @private
   * @param {Object} parsedQuery - Parsed query
   * @param {Object} context - Session context
   * @returns {boolean} - Whether relationship is ambiguous
   */
  _checkRelationshipAmbiguity(parsedQuery, context) {
    const query = parsedQuery.originalQuery || parsedQuery.query || '';
    
    // Check for relationship keywords without clear specification
    for (const pattern of this.ambiguityPatterns.relationship) {
      if (pattern.pattern.test(query)) {
        // If there are multiple entities but relationship is unclear
        if (parsedQuery.entities && Object.keys(parsedQuery.entities).length >= 2) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Generate intent disambiguation options
   * @private
   * @param {Object} parsedQuery - Parsed query
   * @param {Object} context - Session context
   * @returns {Promise<Array>} - Intent options
   */
  async _generateIntentOptions(parsedQuery, context) {
    // Try to use LLM-generated options
    const options = await this.generateDisambiguationOptions(parsedQuery, 'intent', context);
    
    if (options && options.length > 0) {
      return options;
    }
    
    // Fallback to default options based on patterns
    const query = parsedQuery.originalQuery || parsedQuery.query || '';
    const defaultOptions = [];
    
    // Match patterns and collect options
    for (const pattern of this.ambiguityPatterns.intent) {
      if (pattern.pattern.test(query)) {
        for (const option of pattern.options) {
          defaultOptions.push({
            description: `You want to ${option}`,
            intent: option.replace(/\s+/g, '_'),
            followUpQuestion: `Did you want to ${option}?`
          });
        }
      }
    }
    
    return defaultOptions.slice(0, this.options.maxDisambiguationOptions);
  }
  
  /**
   * Generate entity disambiguation options
   * @private
   * @param {Object} parsedQuery - Parsed query
   * @param {Object} entityAmbiguity - Entity ambiguity data
   * @param {Object} context - Session context
   * @returns {Promise<Array>} - Entity options
   */
  async _generateEntityOptions(parsedQuery, entityAmbiguity, context) {
    // Try to use LLM-generated options first
    const options = await this.generateDisambiguationOptions(
      { ...parsedQuery, entityType: entityAmbiguity.entityType },
      'entity',
      context
    );
    
    if (options && options.length > 0) {
      return options;
    }
    
    // Fallback to default options based on entity type
    const entityType = entityAmbiguity.entityType;
    const defaultOptions = [];
    
    switch (entityType) {
      case 'terminal':
        defaultOptions.push(
          { value: 'Terminal 1', description: 'Terminal 1' },
          { value: 'Terminal 2', description: 'Terminal 2' },
          { value: 'All terminals', description: 'All terminals' }
        );
        break;
        
      case 'stand':
        defaultOptions.push(
          { value: 'A1', description: 'Stand A1' },
          { value: 'B2', description: 'Stand B2' },
          { value: 'All stands', description: 'All stands' }
        );
        break;
        
      case 'time_period':
        defaultOptions.push(
          { value: 'today', description: 'Today' },
          { value: 'this week', description: 'This week' },
          { value: 'peak hours', description: 'Peak hours' }
        );
        break;
        
      default:
        defaultOptions.push(
          { value: 'Option 1', description: 'Option 1' },
          { value: 'Option 2', description: 'Option 2' },
          { value: 'Option 3', description: 'Option 3' }
        );
    }
    
    return defaultOptions.map(option => ({
      entityType,
      entityValue: option.value,
      description: option.description
    }));
  }
  
  /**
   * Generate relationship disambiguation options
   * @private
   * @param {Object} parsedQuery - Parsed query
   * @param {Object} context - Session context
   * @returns {Promise<Array>} - Relationship options
   */
  async _generateRelationshipOptions(parsedQuery, context) {
    // Try to use LLM-generated options
    const options = await this.generateDisambiguationOptions(parsedQuery, 'relationship', context);
    
    if (options && options.length > 0) {
      return options;
    }
    
    // Fallback to default options
    return [
      {
        relationshipType: 'impact',
        description: 'How one affects the other',
        clarificationQuestion: 'Are you asking about how one affects the other?',
        impliedIntent: 'impact_analysis'
      },
      {
        relationshipType: 'comparison',
        description: 'Comparing two or more items',
        clarificationQuestion: 'Are you trying to compare these items?',
        impliedIntent: 'comparison'
      },
      {
        relationshipType: 'correlation',
        description: 'Statistical relationship between items',
        clarificationQuestion: 'Are you looking for correlations between these items?',
        impliedIntent: 'correlation_analysis'
      }
    ];
  }
  
  /**
   * Get default options for an ambiguity type
   * @private
   * @param {Object} parsedQuery - Parsed query
   * @param {string} ambiguityType - Type of ambiguity
   * @param {Object} context - Session context
   * @returns {Promise<Array>} - Default options
   */
  async _getDefaultOptions(parsedQuery, ambiguityType, context) {
    switch (ambiguityType) {
      case 'intent':
        return await this._generateIntentOptions(parsedQuery, context);
        
      case 'entity':
        // For entity ambiguity, we need the specific entity type
        // This is typically called for a specific entity ambiguity
        return await this._generateEntityOptions(
          parsedQuery,
          { entityType: parsedQuery.entityType || 'unknown' },
          context
        );
        
      case 'relationship':
        return await this._generateRelationshipOptions(parsedQuery, context);
        
      default:
        return [];
    }
  }
  
  /**
   * Find missing entities based on intent requirements
   * @private
   * @param {Object} parsedQuery - Parsed query 
   * @param {Object} context - Session context
   * @returns {Array<string>} - Missing entity types
   */
  _findMissingEntities(parsedQuery, context) {
    // Intent-specific required entities
    const requiredEntities = {
      'capacity_query': ['terminal'],
      'maintenance_query': ['stand'],
      'stand_status_query': ['stand'],
      'infrastructure_query': ['terminal'],
      'scenario_query': ['scenario_name']
    };
    
    // Get required entities for this intent
    const required = requiredEntities[parsedQuery.intent] || [];
    const present = parsedQuery.entities ? Object.keys(parsedQuery.entities) : [];
    
    // Find missing required entities
    return required.filter(entity => !present.includes(entity));
  }
  
  /**
   * Store disambiguation request in working memory
   * @private
   * @param {Object} parsedQuery - Original query
   * @param {Array} ambiguities - Detected ambiguities
   * @param {Object} context - Session context
   * @returns {Promise<void>}
   */
  async _storeDisambiguationRequest(parsedQuery, ambiguities, context) {
    try {
      const sessionId = context.sessionId;
      const queryId = context.queryId || `query-${Date.now()}`;
      
      if (!sessionId) return;
      
      // Store using working memory service
      await this.workingMemoryService.storeSessionData(
        sessionId,
        `disambiguation:${queryId}:request`,
        {
          timestamp: Date.now(),
          originalQuery: parsedQuery,
          ambiguities,
          status: 'requested'
        }
      );
      
      // Update session context
      const sessionContext = await this.workingMemoryService.getSessionContext(sessionId) || {};
      
      // Add this to disambiguation history
      const disambiguationHistory = sessionContext.disambiguationHistory || [];
      disambiguationHistory.unshift({
        queryId,
        timestamp: Date.now(),
        status: 'requested'
      });
      
      // Keep only last 10 disambiguations
      if (disambiguationHistory.length > 10) {
        disambiguationHistory.pop();
      }
      
      await this.workingMemoryService.updateSessionContextField(
        sessionId,
        'disambiguationHistory',
        disambiguationHistory
      );
      
      await this.workingMemoryService.updateSessionContextField(
        sessionId,
        'lastDisambiguationQueryId',
        queryId
      );
    } catch (error) {
      this.logger.error(`Error storing disambiguation request: ${error.message}`);
      // Non-critical error, continue without storage
    }
  }
  
  /**
   * Store disambiguation result in working memory
   * @private
   * @param {Object} disambiguationData - Original disambiguation data
   * @param {Object} userResponse - User's selection
   * @param {Object} clarifiedQuery - Resulting clarified query
   * @param {Object} context - Session context
   * @returns {Promise<void>}
   */
  async _storeDisambiguationResult(disambiguationData, userResponse, clarifiedQuery, context) {
    try {
      const sessionId = context.sessionId;
      const queryId = context.queryId || disambiguationData.originalQuery?.queryId || `query-${Date.now()}`;
      
      if (!sessionId) return;
      
      // Store using working memory service
      await this.workingMemoryService.storeSessionData(
        sessionId,
        `disambiguation:${queryId}:result`,
        {
          timestamp: Date.now(),
          originalDisambiguation: disambiguationData,
          userResponse,
          clarifiedQuery,
          status: 'resolved'
        }
      );
      
      // Update session context
      const sessionContext = await this.workingMemoryService.getSessionContext(sessionId) || {};
      
      // Update disambiguation history
      const disambiguationHistory = sessionContext.disambiguationHistory || [];
      const existingIndex = disambiguationHistory.findIndex(d => d.queryId === queryId);
      
      if (existingIndex >= 0) {
        disambiguationHistory[existingIndex].status = 'resolved';
        disambiguationHistory[existingIndex].responseTimestamp = Date.now();
      }
      
      await this.workingMemoryService.updateSessionContextField(
        sessionId,
        'disambiguationHistory',
        disambiguationHistory
      );
    } catch (error) {
      this.logger.error(`Error storing disambiguation result: ${error.message}`);
      // Non-critical error, continue without storage
    }
  }
  
  /**
   * Get performance metrics
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
      totalAmbiguousQueries: 0,
      totalDisambiguationInteractions: 0,
      intentAmbiguities: 0,
      entityAmbiguities: 0,
      relationshipAmbiguities: 0,
      successfulDisambiguations: 0,
      failedDisambiguations: 0,
      averageOptionsPresented: 0,
      totalOptionsPresented: 0
    };
  }
  
  /**
   * Update configuration options
   * @param {Object} options - New configuration options
   */
  updateConfig(options) {
    this.options = {
      ...this.options,
      ...options
    };
    
    this.logger.info('QueryDisambiguationService configuration updated', this.options);
  }
}

module.exports = new QueryDisambiguationService();