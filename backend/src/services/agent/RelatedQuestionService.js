/**
 * Related Question Service
 * 
 * This service generates contextually relevant follow-up question suggestions
 * based on the current query, conversation history, and domain knowledge.
 * It helps users discover additional insights and guides the conversation flow.
 * 
 * Features:
 * - Generation of personalized follow-up questions
 * - Contextual suggestions based on user history and preferences
 * - Integration with knowledge retrieval for informed suggestions
 * - Tracking of suggestion usage for learning
 */

const logger = require('../../utils/logger');
const OpenAIService = require('./OpenAIService');
const WorkingMemoryService = require('./WorkingMemoryService');

class RelatedQuestionService {
  /**
   * Initialize the related question service
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
      maxSuggestions: options.maxSuggestions || 3,
      suggestionTTL: options.suggestionTTL || 30 * 60 * 1000, // 30 minutes
      minConfidenceThreshold: options.minConfidenceThreshold || 0.6,
      trackSuggestionUsage: options.trackSuggestionUsage !== false,
      prioritizeSimilarEntities: options.prioritizeSimilarEntities !== false,
      ...options
    };
    
    // Initialize logger
    this.logger = services.logger || logger;
    
    // Suggestion templates by category
    this.suggestionTemplates = {
      // Entity-focused suggestions
      entity: {
        terminal: [
          "What is the capacity of {terminal}?",
          "Show maintenance schedule for {terminal}",
          "Compare {terminal} with other terminals"
        ],
        stand: [
          "What is the status of {stand}?",
          "When is {stand} scheduled for maintenance?",
          "Which aircraft types can use {stand}?"
        ],
        time_period: [
          "Show capacity during {time_period}",
          "Compare with previous {time_period}",
          "What is the forecast for next {time_period}?"
        ],
        aircraft_type: [
          "Which stands can accommodate {aircraft_type}?",
          "What is the turnaround time for {aircraft_type}?",
          "Show capacity requirements for {aircraft_type}"
        ]
      },
      
      // Intent-focused suggestions
      intent: {
        capacity_query: [
          "How does this capacity compare to last month?",
          "What factors affect this capacity?",
          "When is peak capacity reached?"
        ],
        maintenance_query: [
          "How does this maintenance affect capacity?",
          "Are there alternative maintenance schedules?",
          "What is the impact on operations?"
        ],
        infrastructure_query: [
          "What are the future expansion plans?",
          "How does this compare to other airports?",
          "What are the capacity constraints?"
        ],
        stand_status_query: [
          "Show nearby stands that are available",
          "What is the utilization rate for this stand?",
          "When is the next scheduled maintenance?"
        ],
        scenario_query: [
          "How does this scenario compare to the baseline?",
          "What are the key assumptions in this scenario?",
          "Can you optimize this scenario?"
        ]
      },
      
      // Relationship-focused suggestions
      relationship: [
        "How does {entity1} affect {entity2}?",
        "What is the correlation between {entity1} and {entity2}?",
        "Compare performance of {entity1} versus {entity2}",
        "How would changing {entity1} impact {entity2}?"
      ],
      
      // General follow-up suggestions
      general: [
        "Can you show me a visualization of this data?",
        "What insights can you provide from this information?",
        "How does this compare to industry standards?",
        "What recommendations would you make based on this?",
        "Can you explain why this is happening?"
      ]
    };
    
    // Initialize metrics
    this.metrics = {
      totalSuggestionsGenerated: 0,
      totalSuggestionsUsed: 0,
      entitySuggestions: 0,
      intentSuggestions: 0,
      relationshipSuggestions: 0,
      generalSuggestions: 0,
      suggestionUsageRate: 0
    };
    
    this.logger.info('RelatedQuestionService initialized');
  }

  /**
   * Generate related question suggestions
   * 
   * @param {Object} queryResult - Result of a processed query
   * @param {Object} context - Session context
   * @returns {Promise<Array>} - Related question suggestions
   */
  async generateSuggestions(queryResult, context = {}) {
    try {
      if (!queryResult) {
        return [];
      }
      
      // Extract key information from query result
      const { 
        parsedQuery, 
        response, 
        handlerUsed 
      } = queryResult;
      
      // Get enhanced context for better suggestions
      const enhancedContext = await this._getEnhancedContext(context);
      
      // Generate suggestions using different strategies
      const suggestions = [];
      
      // 1. Entity-based suggestions
      const entitySuggestions = await this._generateEntitySuggestions(
        parsedQuery, 
        enhancedContext
      );
      suggestions.push(...entitySuggestions);
      
      // 2. Intent-based suggestions
      const intentSuggestions = this._generateIntentSuggestions(
        parsedQuery,
        enhancedContext
      );
      suggestions.push(...intentSuggestions);
      
      // 3. Relationship-based suggestions
      const relationshipSuggestions = this._generateRelationshipSuggestions(
        parsedQuery,
        enhancedContext
      );
      suggestions.push(...relationshipSuggestions);
      
      // 4. General follow-up suggestions
      const generalSuggestions = this._generateGeneralSuggestions(
        queryResult,
        enhancedContext
      );
      suggestions.push(...generalSuggestions);
      
      // 5. Use LLM for personalized suggestions if needed
      if (suggestions.length < this.options.maxSuggestions) {
        const llmSuggestions = await this._generatePersonalizedSuggestions(
          queryResult, 
          enhancedContext,
          this.options.maxSuggestions - suggestions.length
        );
        suggestions.push(...llmSuggestions);
      }
      
      // Deduplicate and limit results
      const uniqueSuggestions = this._deduplicateSuggestions(suggestions);
      const finalSuggestions = this._rankAndLimitSuggestions(
        uniqueSuggestions,
        enhancedContext
      );
      
      // Update metrics
      this.metrics.totalSuggestionsGenerated += finalSuggestions.length;
      
      // Update suggestion type metrics
      for (const suggestion of finalSuggestions) {
        if (suggestion.type === 'entity') this.metrics.entitySuggestions++;
        else if (suggestion.type === 'intent') this.metrics.intentSuggestions++;
        else if (suggestion.type === 'relationship') this.metrics.relationshipSuggestions++;
        else this.metrics.generalSuggestions++;
      }
      
      // Store suggestions if tracking is enabled
      if (this.options.trackSuggestionUsage && context.sessionId) {
        await this._storeSuggestions(
          context.sessionId,
          context.queryId || `query-${Date.now()}`,
          finalSuggestions
        );
      }
      
      return finalSuggestions;
    } catch (error) {
      this.logger.error(`Error generating suggestions: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Track when a suggestion is used
   * 
   * @param {string} suggestionId - ID of the used suggestion
   * @param {Object} context - Session context
   * @returns {Promise<boolean>} - Success indicator
   */
  async trackSuggestionUsage(suggestionId, context = {}) {
    try {
      if (!this.options.trackSuggestionUsage || !context.sessionId) {
        return false;
      }
      
      this.metrics.totalSuggestionsUsed++;
      this.metrics.suggestionUsageRate = this.metrics.totalSuggestionsUsed / 
        this.metrics.totalSuggestionsGenerated;
      
      // Get stored suggestions
      const sessionData = await this.workingMemoryService.getSessionData(
        context.sessionId,
        'suggestions'
      );
      
      if (!sessionData || !sessionData.items) {
        return false;
      }
      
      // Find the used suggestion
      const suggestionIndex = sessionData.items.findIndex(s => s.id === suggestionId);
      if (suggestionIndex < 0) {
        return false;
      }
      
      // Mark suggestion as used
      sessionData.items[suggestionIndex].used = true;
      sessionData.items[suggestionIndex].usedAt = Date.now();
      
      // Update session data
      await this.workingMemoryService.storeSessionData(
        context.sessionId,
        'suggestions',
        sessionData
      );
      
      // Update session context with suggestion usage
      const sessionContext = await this.workingMemoryService.getSessionContext(context.sessionId) || {};
      const suggestionHistory = sessionContext.suggestionHistory || [];
      
      suggestionHistory.unshift({
        suggestionId,
        text: sessionData.items[suggestionIndex].text,
        type: sessionData.items[suggestionIndex].type,
        usedAt: Date.now()
      });
      
      // Keep only last 10 used suggestions
      if (suggestionHistory.length > 10) {
        suggestionHistory.pop();
      }
      
      await this.workingMemoryService.updateSessionContextField(
        context.sessionId,
        'suggestionHistory',
        suggestionHistory
      );
      
      return true;
    } catch (error) {
      this.logger.error(`Error tracking suggestion usage: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get enhanced context for generating suggestions
   * @private
   * @param {Object} context - Base context
   * @returns {Promise<Object>} - Enhanced context
   */
  async _getEnhancedContext(context) {
    try {
      const enhancedContext = { ...context };
      
      if (context.sessionId) {
        // Get user preferences
        const sessionContext = await this.workingMemoryService.getSessionContext(context.sessionId);
        if (sessionContext) {
          enhancedContext.userPreferences = sessionContext.userPreferences;
          enhancedContext.suggestionHistory = sessionContext.suggestionHistory;
          enhancedContext.lastEntities = sessionContext.lastEntities;
        }
        
        // Get recent entities
        const recentEntities = await this.workingMemoryService.getEntityMentions(
          context.sessionId,
          { limit: 5 }
        );
        
        if (recentEntities && recentEntities.length > 0) {
          enhancedContext.recentEntities = recentEntities;
        }
        
        // Get previous queries
        const previousQueries = sessionContext?.previousQueries || [];
        if (previousQueries.length > 0) {
          enhancedContext.previousQueries = previousQueries;
        }
      }
      
      return enhancedContext;
    } catch (error) {
      this.logger.error(`Error getting enhanced context: ${error.message}`);
      return context;
    }
  }
  
  /**
   * Generate entity-based suggestions
   * @private
   * @param {Object} parsedQuery - Parsed query information
   * @param {Object} context - Enhanced context
   * @returns {Promise<Array>} - Entity-based suggestions
   */
  async _generateEntitySuggestions(parsedQuery, context) {
    const suggestions = [];
    
    if (!parsedQuery || !parsedQuery.entities) {
      return suggestions;
    }
    
    // Generate suggestions for each entity in the query
    for (const [entityType, entityValue] of Object.entries(parsedQuery.entities)) {
      if (this.suggestionTemplates.entity[entityType]) {
        const templates = this.suggestionTemplates.entity[entityType];
        
        // Fill in entity values in templates
        for (const template of templates) {
          const text = template.replace(`{${entityType}}`, entityValue);
          
          suggestions.push({
            id: `entity-${entityType}-${Date.now()}-${suggestions.length}`,
            type: 'entity',
            text,
            entityType,
            entityValue,
            confidence: 0.8,
            source: 'template'
          });
        }
      }
    }
    
    // Add cross-entity suggestions if multiple entities are present
    if (Object.keys(parsedQuery.entities).length >= 2) {
      const entityTypes = Object.keys(parsedQuery.entities);
      for (let i = 0; i < entityTypes.length; i++) {
        for (let j = i + 1; j < entityTypes.length; j++) {
          const entity1Type = entityTypes[i];
          const entity2Type = entityTypes[j];
          const entity1Value = parsedQuery.entities[entity1Type];
          const entity2Value = parsedQuery.entities[entity2Type];
          
          suggestions.push({
            id: `relationship-${entity1Type}-${entity2Type}-${Date.now()}`,
            type: 'relationship',
            text: `How does ${entity1Value} relate to ${entity2Value}?`,
            entities: [
              { type: entity1Type, value: entity1Value },
              { type: entity2Type, value: entity2Value }
            ],
            confidence: 0.75,
            source: 'template'
          });
        }
      }
    }
    
    // Add suggestions for related entities from context
    if (context.recentEntities && context.recentEntities.length > 0) {
      const currentEntities = new Set(Object.keys(parsedQuery.entities));
      
      for (const recentEntity of context.recentEntities) {
        // Only suggest entities not in the current query
        if (!currentEntities.has(recentEntity.type)) {
          suggestions.push({
            id: `related-entity-${recentEntity.type}-${Date.now()}`,
            type: 'entity',
            text: `What about ${recentEntity.value}?`,
            entityType: recentEntity.type,
            entityValue: recentEntity.value,
            confidence: 0.7,
            source: 'context'
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Generate intent-based suggestions
   * @private
   * @param {Object} parsedQuery - Parsed query information
   * @param {Object} context - Enhanced context
   * @returns {Array} - Intent-based suggestions
   */
  _generateIntentSuggestions(parsedQuery, context) {
    const suggestions = [];
    
    if (!parsedQuery || !parsedQuery.intent) {
      return suggestions;
    }
    
    // Get suggestions for the current intent
    if (this.suggestionTemplates.intent[parsedQuery.intent]) {
      const templates = this.suggestionTemplates.intent[parsedQuery.intent];
      
      for (const template of templates) {
        suggestions.push({
          id: `intent-${parsedQuery.intent}-${Date.now()}-${suggestions.length}`,
          type: 'intent',
          text: template,
          intent: parsedQuery.intent,
          confidence: 0.75,
          source: 'template'
        });
      }
    }
    
    // Add suggestions for related intents
    const relatedIntents = this._getRelatedIntents(parsedQuery.intent);
    for (const relatedIntent of relatedIntents) {
      if (this.suggestionTemplates.intent[relatedIntent]) {
        const templates = this.suggestionTemplates.intent[relatedIntent];
        
        // Add one suggestion for each related intent
        if (templates.length > 0) {
          suggestions.push({
            id: `related-intent-${relatedIntent}-${Date.now()}`,
            type: 'intent',
            text: templates[0], // Use first template
            intent: relatedIntent,
            confidence: 0.7,
            source: 'related_intent'
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Generate relationship-based suggestions
   * @private
   * @param {Object} parsedQuery - Parsed query information
   * @param {Object} context - Enhanced context
   * @returns {Array} - Relationship-based suggestions
   */
  _generateRelationshipSuggestions(parsedQuery, context) {
    const suggestions = [];
    
    if (!parsedQuery || !parsedQuery.entities || Object.keys(parsedQuery.entities).length < 1) {
      return suggestions;
    }
    
    // Use current entities
    const entities = Object.entries(parsedQuery.entities).map(([type, value]) => ({
      type,
      value
    }));
    
    // If current query has only one entity, try to find related entities from context
    if (entities.length === 1 && context.recentEntities) {
      const currentEntityType = entities[0].type;
      
      // Find different entity types from context
      for (const recentEntity of context.recentEntities) {
        if (recentEntity.type !== currentEntityType) {
          // Use relationship templates
          for (const template of this.suggestionTemplates.relationship) {
            const text = template
              .replace('{entity1}', entities[0].value)
              .replace('{entity2}', recentEntity.value);
            
            suggestions.push({
              id: `relationship-context-${Date.now()}-${suggestions.length}`,
              type: 'relationship',
              text,
              entities: [
                entities[0],
                { type: recentEntity.type, value: recentEntity.value }
              ],
              confidence: 0.65,
              source: 'context'
            });
            
            // Limit to one suggestion per entity pair
            break;
          }
        }
      }
    } 
    // If current query has multiple entities, use them for relationship suggestions
    else if (entities.length > 1) {
      // Generate combinations of entities
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          // Use relationship templates
          const template = this.suggestionTemplates.relationship[
            Math.floor(Math.random() * this.suggestionTemplates.relationship.length)
          ];
          
          const text = template
            .replace('{entity1}', entities[i].value)
            .replace('{entity2}', entities[j].value);
          
          suggestions.push({
            id: `relationship-${Date.now()}-${suggestions.length}`,
            type: 'relationship',
            text,
            entities: [entities[i], entities[j]],
            confidence: 0.7,
            source: 'template'
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Generate general follow-up suggestions
   * @private
   * @param {Object} queryResult - Query result
   * @param {Object} context - Enhanced context
   * @returns {Array} - General suggestions
   */
  _generateGeneralSuggestions(queryResult, context) {
    const suggestions = [];
    
    // Add a few general suggestions
    const templates = this.suggestionTemplates.general;
    const numSuggestions = Math.min(2, templates.length);
    
    // Select random templates
    const selectedIndices = new Set();
    while (selectedIndices.size < numSuggestions) {
      selectedIndices.add(Math.floor(Math.random() * templates.length));
    }
    
    // Create suggestions from selected templates
    for (const index of selectedIndices) {
      suggestions.push({
        id: `general-${Date.now()}-${index}`,
        type: 'general',
        text: templates[index],
        confidence: 0.6,
        source: 'template'
      });
    }
    
    return suggestions;
  }
  
  /**
   * Generate personalized suggestions using LLM
   * @private
   * @param {Object} queryResult - Query result
   * @param {Object} context - Enhanced context
   * @param {number} count - Number of suggestions to generate
   * @returns {Promise<Array>} - Personalized suggestions
   */
  async _generatePersonalizedSuggestions(queryResult, context, count = 2) {
    try {
      if (!queryResult || count <= 0) {
        return [];
      }
      
      // Prepare prompt with context information
      const prompt = `
      Generate ${count} personalized follow-up question suggestions for this query:
      
      Original query: ${queryResult.parsedQuery?.query || 'Unknown'}
      Query intent: ${queryResult.parsedQuery?.intent || 'Unknown'}
      Entities: ${JSON.stringify(queryResult.parsedQuery?.entities || {})}
      
      ${context.previousQueries ? `Previous queries: 
      ${context.previousQueries.slice(0, 3).map(q => q.text || q.query).join('\n')}` : ''}
      
      ${context.recentEntities ? `Recent entities mentioned: 
      ${context.recentEntities.slice(0, 5).map(e => `${e.type}: ${e.value}`).join('\n')}` : ''}
      
      Format the suggestions as a JSON array where each suggestion has:
      - text: The suggested question text
      - type: The suggestion type (entity, intent, relationship, or general)
      - confidence: A confidence score between 0 and 1
      
      Make the suggestions relevant, diverse, and natural follow-ups to the current query.
      `;
      
      // Get suggestions from LLM
      const response = await this.openAIService.processQuery(prompt);
      
      // Parse JSON response
      try {
        const jsonMatch = response.text.match(/\[\s*{[\s\S]*}\s*\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          
          // Add source and IDs
          return suggestions.map(suggestion => ({
            ...suggestion,
            id: `llm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            source: 'llm'
          }));
        }
      } catch (parseError) {
        this.logger.warn(`Failed to parse LLM suggestions: ${parseError.message}`);
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Error generating personalized suggestions: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Deduplicate suggestions based on similarity
   * @private
   * @param {Array} suggestions - Array of suggestions
   * @returns {Array} - Deduplicated suggestions
   */
  _deduplicateSuggestions(suggestions) {
    if (!suggestions || suggestions.length <= 1) {
      return suggestions;
    }
    
    const seen = new Set();
    const result = [];
    
    for (const suggestion of suggestions) {
      // Normalize text for comparison
      const normalizedText = suggestion.text.toLowerCase().trim();
      
      if (!seen.has(normalizedText)) {
        seen.add(normalizedText);
        result.push(suggestion);
      }
    }
    
    return result;
  }
  
  /**
   * Rank and limit suggestions
   * @private
   * @param {Array} suggestions - Array of suggestions
   * @param {Object} context - Enhanced context
   * @returns {Array} - Ranked and limited suggestions
   */
  _rankAndLimitSuggestions(suggestions, context) {
    if (!suggestions || suggestions.length === 0) {
      return [];
    }
    
    // Filter by confidence threshold
    const filteredSuggestions = suggestions.filter(
      s => s.confidence >= this.options.minConfidenceThreshold
    );
    
    // Copy so we don't mutate the original
    const rankedSuggestions = [...filteredSuggestions];
    
    // Sort by confidence and relevance
    rankedSuggestions.sort((a, b) => {
      // First by confidence
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      
      // Prioritize entity suggestions if option is enabled
      if (this.options.prioritizeSimilarEntities) {
        if (a.type === 'entity' && b.type !== 'entity') return -1;
        if (b.type === 'entity' && a.type !== 'entity') return 1;
      }
      
      // Prioritize by source
      const sourceRank = { llm: 3, template: 2, context: 1 };
      return (sourceRank[b.source] || 0) - (sourceRank[a.source] || 0);
    });
    
    // Limit to max suggestions, but ensure diversity
    const result = [];
    const typeCount = {};
    
    // First pass: select diverse suggestions
    for (const suggestion of rankedSuggestions) {
      typeCount[suggestion.type] = (typeCount[suggestion.type] || 0) + 1;
      
      // Only add if we have fewer than 2 of this type
      if (typeCount[suggestion.type] <= 2 && result.length < this.options.maxSuggestions) {
        result.push(suggestion);
      }
    }
    
    // Second pass: fill remaining slots with highest confidence suggestions
    if (result.length < this.options.maxSuggestions) {
      for (const suggestion of rankedSuggestions) {
        if (!result.includes(suggestion) && result.length < this.options.maxSuggestions) {
          result.push(suggestion);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get related intents for a given intent
   * @private
   * @param {string} intent - Current intent
   * @returns {Array<string>} - Related intents
   */
  _getRelatedIntents(intent) {
    // Intent relationship map
    const relatedIntentMap = {
      'capacity_query': ['maintenance_query', 'infrastructure_query', 'scenario_query'],
      'maintenance_query': ['capacity_query', 'stand_status_query'],
      'infrastructure_query': ['capacity_query', 'stand_status_query'],
      'stand_status_query': ['maintenance_query', 'infrastructure_query'],
      'scenario_query': ['capacity_query', 'what_if_analysis']
    };
    
    return relatedIntentMap[intent] || [];
  }
  
  /**
   * Store suggestions in working memory
   * @private
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Array} suggestions - Generated suggestions
   * @returns {Promise<void>}
   */
  async _storeSuggestions(sessionId, queryId, suggestions) {
    try {
      // Get existing suggestions
      const existingData = await this.workingMemoryService.getSessionData(
        sessionId,
        'suggestions'
      ) || { items: [] };
      
      // Add timestamp and query information
      const enhancedSuggestions = suggestions.map(suggestion => ({
        ...suggestion,
        queryId,
        timestamp: Date.now(),
        used: false
      }));
      
      // Merge with existing suggestions, keeping the newest ones
      existingData.items = [
        ...enhancedSuggestions,
        ...existingData.items.filter(s => s.queryId !== queryId)
      ];
      
      // Limit total number of stored suggestions
      if (existingData.items.length > 20) {
        existingData.items = existingData.items.slice(0, 20);
      }
      
      // Store updated suggestions
      await this.workingMemoryService.storeSessionData(
        sessionId,
        'suggestions',
        {
          ...existingData,
          lastUpdated: Date.now()
        }
      );
      
      // Update session context
      const sessionContext = await this.workingMemoryService.getSessionContext(sessionId) || {};
      
      await this.workingMemoryService.updateSessionContextField(
        sessionId,
        'lastSuggestionQueryId',
        queryId
      );
      
      await this.workingMemoryService.updateSessionContextField(
        sessionId,
        'lastSuggestionCount',
        suggestions.length
      );
    } catch (error) {
      this.logger.error(`Error storing suggestions: ${error.message}`);
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
      totalSuggestionsGenerated: 0,
      totalSuggestionsUsed: 0,
      entitySuggestions: 0,
      intentSuggestions: 0,
      relationshipSuggestions: 0,
      generalSuggestions: 0,
      suggestionUsageRate: 0
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
    
    this.logger.info('RelatedQuestionService configuration updated', this.options);
  }
}

module.exports = new RelatedQuestionService();