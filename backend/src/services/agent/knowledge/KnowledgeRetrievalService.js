/**
 * KnowledgeRetrievalService.js
 * 
 * This service provides unified access to knowledge from various sources including:
 * - Domain-specific knowledge (stands, aircraft, etc.)
 * - Long-term memory (historical data, past conversations)
 * - Vector-based similarity search (related content)
 * - Working memory (current conversation context)
 * 
 * It serves as the primary knowledge access layer for the agent, combining
 * structured and unstructured data retrieval to enhance responses.
 */

const logger = require('../../../utils/logger');
const { VectorSearchService } = require('../VectorSearchService');
const { performance } = require('perf_hooks');

class KnowledgeRetrievalService {
  /**
   * Initialize the knowledge retrieval service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Store services
    this.services = services;
    this.options = options;
    
    // Initialize dependencies
    this.vectorSearchService = services.vectorSearchService || new VectorSearchService();
    this.longTermMemoryService = services.longTermMemoryService;
    this.workingMemoryService = services.workingMemoryService;
    
    // Knowledge base access services
    this.standDataService = services.standDataService || 
      (services.knowledgeServices ? services.knowledgeServices.StandDataService : null);
    this.airportConfigService = services.airportConfigService || 
      (services.knowledgeServices ? services.knowledgeServices.AirportConfigDataService : null);
    this.maintenanceDataService = services.maintenanceDataService || 
      (services.knowledgeServices ? services.knowledgeServices.MaintenanceDataService : null);
    this.referenceDataService = services.referenceDataService || 
      (services.knowledgeServices ? services.knowledgeServices.ReferenceDataService : null);
    
    // Initialize logger
    this.logger = services.logger || logger;
    
    // Configure retrieval options
    this.maxResults = options.maxResults || 5;
    this.similarityThreshold = options.similarityThreshold || 0.7;
    this.includeMetadata = options.includeMetadata !== undefined ? options.includeMetadata : true;
    
    // Performance metrics
    this.metrics = {
      totalQueries: 0,
      vectorSearches: 0,
      structuredQueries: 0,
      combinedQueries: 0,
      totalRetrievalTimeMs: 0,
      cacheHits: 0
    };
    
    this.logger.info('KnowledgeRetrievalService initialized');
  }
  
  /**
   * Retrieve knowledge relevant to a query
   * 
   * @param {Object} query - The query object
   * @param {string} query.text - Raw query text
   * @param {Object} query.parsedQuery - Structured parsed query (optional)
   * @param {string} query.queryId - Unique identifier for the query (optional)
   * @param {Object} context - The conversation context
   * @param {string} context.sessionId - Session identifier
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} - Retrieved knowledge
   */
  async retrieveKnowledge(query, context = {}, options = {}) {
    const startTime = performance.now();
    const sessionId = context.sessionId;
    const queryId = query.queryId || `query-${Date.now()}`;
    
    try {
      this.metrics.totalQueries++;
      
      // Track entities if working memory service is available
      if (this.workingMemoryService && query.parsedQuery && query.parsedQuery.entities) {
        const entities = Object.entries(query.parsedQuery.entities).map(([type, value]) => ({
          type,
          value: typeof value === 'object' ? JSON.stringify(value) : value.toString(),
          confidence: query.parsedQuery.confidence?.[type] || 0.9
        }));
        
        if (entities.length > 0) {
          this.workingMemoryService.storeEntityMentions(sessionId, queryId, entities);
        }
      }
      
      // Get retrieval context from working memory if available
      let retrievalContext = {};
      if (this.workingMemoryService) {
        retrievalContext = this.workingMemoryService.getKnowledgeRetrievalContext(sessionId, queryId, {
          entityLimit: options.entityLimit || 10,
          historyLimit: options.historyLimit || 3
        });
      }
      
      // Augment context with retrieval context
      const augmentedContext = { ...context, retrievalContext };
      
      // Determine retrieval strategy based on query content
      const retrievalStrategy = this.determineRetrievalStrategy(query, augmentedContext);
      
      // Store retrieval context
      if (this.workingMemoryService) {
        this.workingMemoryService.storeRetrievalContext(sessionId, queryId, {
          strategy: retrievalStrategy,
          query: query.text,
          parsedIntent: query.parsedQuery?.intent,
          entities: query.parsedQuery?.entities
        });
      }
      
      let results = null;
      
      switch (retrievalStrategy) {
        case 'structured':
          results = await this.structuredRetrieval(query, augmentedContext, options);
          this.metrics.structuredQueries++;
          break;
          
        case 'vector':
          results = await this.vectorRetrieval(query, augmentedContext, options);
          this.metrics.vectorSearches++;
          break;
          
        case 'combined':
        default:
          results = await this.combinedRetrieval(query, augmentedContext, options);
          this.metrics.combinedQueries++;
          break;
      }
      
      // Store the retrieval results in working memory
      if (this.workingMemoryService && results) {
        const metadata = {
          strategy: retrievalStrategy,
          sources: this.getSourcesFromResults(results),
          query: query.text,
          itemCount: this.countItems(results)
        };
        
        const knowledgeItems = this.flattenResults(results);
        this.workingMemoryService.storeRetrievedKnowledge(sessionId, queryId, knowledgeItems, metadata);
      }
      
      return this.formatResults(results, retrievalStrategy, options);
    } catch (error) {
      this.logger.error(`Error in knowledge retrieval: ${error.message}`, error);
      throw error;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.metrics.totalRetrievalTimeMs += duration;
      
      if (duration > 1000) {
        this.logger.warn(`Slow knowledge retrieval: ${duration.toFixed(2)}ms for query: ${query.text}`);
      }
    }
  }
  
  /**
   * Determine the best retrieval strategy for a query
   * 
   * @param {Object} query - The query object
   * @param {Object} context - The augmented context with retrievalContext
   * @returns {string} - Retrieval strategy: 'structured', 'vector', or 'combined'
   */
  determineRetrievalStrategy(query, context = {}) {
    // If we have a parsed query with intent and entities, use structured retrieval
    if (query.parsedQuery && query.parsedQuery.intent && Object.keys(query.parsedQuery.entities || {}).length > 0) {
      // If the query is asking for factual information, use structured retrieval
      const factualIntents = [
        'stand.details', 'stand.status', 'stand.location', 'terminal.stands', 'pier.stands',
        'airport.info', 'airport.details', 'airline.info', 'airline.details',
        'aircraft.info', 'maintenance.status', 'maintenance.schedule'
      ];
      
      if (factualIntents.includes(query.parsedQuery.intent)) {
        return 'structured';
      }
    }
    
    // Check retrieval context for entity mentions
    const recentEntities = context.retrievalContext?.recentEntities || [];
    const significantEntityTypes = ['stand', 'terminal', 'airline', 'aircraft', 'maintenance'];
    const hasSignificantEntity = recentEntities.some(entity => 
      significantEntityTypes.includes(entity.type) && entity.confidence > 0.8
    );
    
    // If there are significant entities in context, prefer structured retrieval
    if (hasSignificantEntity && query.parsedQuery) {
      return 'structured';
    }
    
    // If the query is looking for similar content or depends on context, use vector search
    if (
      query.text.includes('similar') || 
      query.text.includes('like') || 
      query.text.includes('related') ||
      query.text.includes('remember') ||
      query.text.includes('previous')
    ) {
      return 'vector';
    }
    
    // Check for references to past interactions or previous results
    if (context.retrievalContext?.retrievalHistory?.length > 0) {
      return 'combined';
    }
    
    // Default to combined approach for more comprehensive results
    return 'combined';
  }
  
  /**
   * Perform structured knowledge retrieval
   * 
   * @param {Object} query - The query object
   * @param {Object} context - The conversation context
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} - Retrieved knowledge
   */
  async structuredRetrieval(query, context, options) {
    const parsedQuery = query.parsedQuery;
    
    if (!parsedQuery) {
      throw new Error('Structured retrieval requires a parsed query');
    }
    
    const { intent, entities } = parsedQuery;
    const results = { facts: [], contextual: [] };
    
    // Check working memory for cached data
    if (this.workingMemoryService && query.sessionId && query.queryId) {
      const cachedData = this.workingMemoryService.getRetrievedKnowledge(query.sessionId, `${intent}:${JSON.stringify(entities)}`);
      
      if (cachedData && cachedData.items && cachedData.items.length > 0) {
        this.metrics.cacheHits++;
        return {
          facts: cachedData.items.filter(item => item.type === 'fact'),
          contextual: cachedData.items.filter(item => item.type === 'contextual')
        };
      }
    }
    
    // Handle different intent categories
    const intentCategory = this.getIntentCategory(intent);
    
    switch (intentCategory) {
      case 'asset':
        await this.retrieveAssetKnowledge(intent, entities, results);
        break;
        
      case 'reference':
        await this.retrieveReferenceKnowledge(intent, entities, results);
        break;
        
      case 'maintenance':
        await this.retrieveMaintenanceKnowledge(intent, entities, results);
        break;
        
      case 'operational':
        await this.retrieveOperationalKnowledge(intent, entities, results);
        break;
        
      default:
        this.logger.warn(`Unknown intent category for intent: ${intent}`);
    }
    
    // Note: Results will be saved to working memory in the main retrieveKnowledge method
    
    return results;
  }
  
  /**
   * Perform vector-based knowledge retrieval
   * 
   * @param {Object} query - The query object
   * @param {Object} context - The conversation context
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} - Retrieved knowledge
   */
  async vectorRetrieval(query, context, options) {
    const queryText = query.text;
    const results = { contextual: [], facts: [] };
    
    // Retrieve from vector search
    if (this.vectorSearchService) {
      const topK = options.maxResults || this.maxResults;
      const searchResults = await this.vectorSearchService.searchSimilarContent(
        queryText,
        topK,
        options.similarityThreshold || this.similarityThreshold
      );
      
      // Add results to contextual knowledge
      if (searchResults && searchResults.length > 0) {
        results.contextual = searchResults.map(item => ({
          content: item.content,
          source: item.source || 'vector-search',
          similarity: item.similarity,
          timestamp: item.timestamp
        }));
      }
    }
    
    // Retrieve from long-term memory
    if (this.longTermMemoryService && context.userId) {
      const memoryResults = await this.longTermMemoryService.retrieveRelevantMemories(
        queryText, 
        context.userId, 
        options.maxResults || this.maxResults
      );
      
      if (memoryResults && memoryResults.length > 0) {
        // Add to contextual knowledge if not already included
        const existingSources = new Set(results.contextual.map(item => item.source));
        
        for (const memory of memoryResults) {
          if (!existingSources.has(memory.source)) {
            results.contextual.push({
              content: memory.content,
              source: memory.source || 'long-term-memory',
              timestamp: memory.timestamp,
              metadata: memory.metadata
            });
            existingSources.add(memory.source);
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Perform combined knowledge retrieval (both structured and vector-based)
   * 
   * @param {Object} query - The query object
   * @param {Object} context - The conversation context
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} - Retrieved knowledge
   */
  async combinedRetrieval(query, context, options) {
    // Run both retrievals in parallel for efficiency
    const [structuredResults, vectorResults] = await Promise.all([
      this.structuredRetrieval(query, context, options).catch(err => {
        this.logger.warn(`Structured retrieval failed: ${err.message}`);
        return { facts: [], contextual: [] };
      }),
      this.vectorRetrieval(query, context, options).catch(err => {
        this.logger.warn(`Vector retrieval failed: ${err.message}`);
        return { contextual: [], facts: [] };
      })
    ]);
    
    // Combine results, removing duplicates
    const combinedResults = {
      facts: [...structuredResults.facts],
      contextual: [...structuredResults.contextual]
    };
    
    // Add vector results to contextual knowledge if not duplicates
    const existingContextual = new Set(combinedResults.contextual.map(item => 
      item.source + ':' + (item.id || '') + ':' + item.content.substring(0, 50)
    ));
    
    for (const item of vectorResults.contextual) {
      const key = item.source + ':' + (item.id || '') + ':' + item.content.substring(0, 50);
      if (!existingContextual.has(key)) {
        combinedResults.contextual.push(item);
        existingContextual.add(key);
      }
    }
    
    return combinedResults;
  }
  
  /**
   * Retrieve asset-related knowledge (stands, terminals, etc.)
   * 
   * @param {string} intent - The query intent
   * @param {Object} entities - The extracted entities
   * @param {Object} results - The results object to populate
   * @returns {Promise<void>}
   */
  async retrieveAssetKnowledge(intent, entities, results) {
    if (!this.standDataService) {
      this.logger.warn('Stand data service not available for asset knowledge retrieval');
      return;
    }
    
    try {
      // Handle stand-related intents
      if (intent.startsWith('stand.')) {
        if (intent === 'stand.details' && entities.stand) {
          // Get stand details
          const stand = await this.standDataService.getStandById(entities.stand);
          if (stand) {
            results.facts.push({
              type: 'stand',
              data: stand,
              source: 'stand-data-service'
            });
          }
        } else if (intent === 'stand.status' && entities.stand) {
          // Get stand status with maintenance info
          const standWithStatus = await this.standDataService.getStandsWithMaintenanceStatus({
            standId: entities.stand
          });
          
          if (standWithStatus && standWithStatus.length > 0) {
            results.facts.push({
              type: 'stand-status',
              data: standWithStatus[0],
              source: 'stand-data-service'
            });
          }
        } else if (intent === 'stand.location' && entities.stand) {
          // Get stand location
          const stand = await this.standDataService.getStandById(entities.stand);
          if (stand) {
            results.facts.push({
              type: 'stand-location',
              data: {
                id: stand.id,
                name: stand.name,
                terminal: stand.terminal,
                pier: stand.pier,
                coordinates: stand.coordinates
              },
              source: 'stand-data-service'
            });
          }
        }
      }
      
      // Handle terminal-related intents
      if (intent === 'terminal.stands' && entities.terminal) {
        const stands = await this.standDataService.getStands({ terminal: entities.terminal });
        if (stands && stands.length > 0) {
          results.facts.push({
            type: 'terminal-stands',
            data: {
              terminal: entities.terminal,
              stands: stands.map(s => ({
                id: s.id,
                name: s.name,
                pier: s.pier,
                type: s.type,
                available: s.available
              }))
            },
            source: 'stand-data-service'
          });
        }
      }
      
      // Handle pier-related intents
      if (intent === 'pier.stands' && entities.pier) {
        const filter = { pier: entities.pier };
        if (entities.terminal) filter.terminal = entities.terminal;
        
        const stands = await this.standDataService.getStands(filter);
        if (stands && stands.length > 0) {
          results.facts.push({
            type: 'pier-stands',
            data: {
              pier: entities.pier,
              terminal: entities.terminal,
              stands: stands.map(s => ({
                id: s.id,
                name: s.name,
                type: s.type,
                available: s.available
              }))
            },
            source: 'stand-data-service'
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error retrieving asset knowledge: ${error.message}`, error);
    }
  }
  
  /**
   * Retrieve reference data knowledge (airports, airlines, etc.)
   * 
   * @param {string} intent - The query intent
   * @param {Object} entities - The extracted entities
   * @param {Object} results - The results object to populate
   * @returns {Promise<void>}
   */
  async retrieveReferenceKnowledge(intent, entities, results) {
    if (!this.referenceDataService) {
      this.logger.warn('Reference data service not available for reference knowledge retrieval');
      return;
    }
    
    try {
      // Handle airport-related intents
      if (intent.startsWith('airport.')) {
        if (intent === 'airport.info' && entities.airport) {
          // Get airport details
          const airport = await this.referenceDataService.getAirportByIATA(entities.airport);
          if (airport) {
            results.facts.push({
              type: 'airport',
              data: airport,
              source: 'reference-data-service'
            });
          }
        } else if (intent === 'airport.search') {
          // Search airports
          const criteria = {};
          if (entities.name) criteria.name = entities.name;
          if (entities.city) criteria.city = entities.city;
          if (entities.country) criteria.country = entities.country;
          
          const airports = await this.referenceDataService.searchAirports(
            criteria, 
            entities.limit || 5
          );
          
          if (airports && airports.length > 0) {
            results.facts.push({
              type: 'airport-search',
              data: {
                criteria,
                results: airports
              },
              source: 'reference-data-service'
            });
          }
        }
      }
      
      // Handle airline-related intents
      if (intent.startsWith('airline.')) {
        if (intent === 'airline.info' && entities.airline) {
          // Get airline details
          const airline = await this.referenceDataService.getAirlineByIATA(entities.airline);
          if (airline) {
            results.facts.push({
              type: 'airline',
              data: airline,
              source: 'reference-data-service'
            });
          }
        } else if (intent === 'airline.search') {
          // Search airlines
          const criteria = {};
          if (entities.name) criteria.name = entities.name;
          if (entities.country) criteria.country = entities.country;
          
          const airlines = await this.referenceDataService.searchAirlines(
            criteria, 
            entities.limit || 5
          );
          
          if (airlines && airlines.length > 0) {
            results.facts.push({
              type: 'airline-search',
              data: {
                criteria,
                results: airlines
              },
              source: 'reference-data-service'
            });
          }
        }
      }
      
      // Handle aircraft-related intents
      if (intent.startsWith('aircraft.')) {
        if (intent === 'aircraft.info' && entities.aircraftType) {
          // Get aircraft details
          const aircraft = await this.referenceDataService.getAircraftTypeByIATA(entities.aircraftType);
          if (aircraft) {
            results.facts.push({
              type: 'aircraft',
              data: aircraft,
              source: 'reference-data-service'
            });
          }
        } else if (intent === 'aircraft.size' && entities.size) {
          // Get aircraft by size
          const aircraft = await this.referenceDataService.getAircraftTypes({
            sizeCategory: entities.size
          }, entities.limit || 10);
          
          if (aircraft && aircraft.length > 0) {
            results.facts.push({
              type: 'aircraft-by-size',
              data: {
                size: entities.size,
                results: aircraft
              },
              source: 'reference-data-service'
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error retrieving reference knowledge: ${error.message}`, error);
    }
  }
  
  /**
   * Retrieve maintenance-related knowledge
   * 
   * @param {string} intent - The query intent
   * @param {Object} entities - The extracted entities
   * @param {Object} results - The results object to populate
   * @returns {Promise<void>}
   */
  async retrieveMaintenanceKnowledge(intent, entities, results) {
    if (!this.maintenanceDataService) {
      this.logger.warn('Maintenance data service not available for maintenance knowledge retrieval');
      return;
    }
    
    try {
      // Handle maintenance-related intents
      if (intent.startsWith('maintenance.')) {
        if (intent === 'maintenance.status') {
          // Get current maintenance status
          let filter = {};
          
          if (entities.standId) {
            filter.standId = entities.standId;
          } else if (entities.stand) {
            filter.standName = entities.stand;
          }
          
          if (entities.status) {
            filter.status = entities.status;
          }
          
          const maintenanceRequests = await this.maintenanceDataService.getMaintenanceRequests(
            filter,
            entities.limit || 10
          );
          
          if (maintenanceRequests && maintenanceRequests.length > 0) {
            results.facts.push({
              type: 'maintenance-status',
              data: {
                filter,
                requests: maintenanceRequests
              },
              source: 'maintenance-data-service'
            });
          }
        } else if (intent === 'maintenance.schedule') {
          // Get maintenance schedule
          const schedule = await this.maintenanceDataService.getUpcomingMaintenanceEvents(
            entities.date || new Date().toISOString().split('T')[0],
            entities.days || 7
          );
          
          if (schedule && schedule.length > 0) {
            results.facts.push({
              type: 'maintenance-schedule',
              data: {
                startDate: entities.date || new Date().toISOString().split('T')[0],
                days: entities.days || 7,
                events: schedule
              },
              source: 'maintenance-data-service'
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error retrieving maintenance knowledge: ${error.message}`, error);
    }
  }
  
  /**
   * Retrieve operational knowledge (capacity, settings, etc.)
   * 
   * @param {string} intent - The query intent
   * @param {Object} entities - The extracted entities
   * @param {Object} results - The results object to populate
   * @returns {Promise<void>}
   */
  async retrieveOperationalKnowledge(intent, entities, results) {
    if (!this.airportConfigService) {
      this.logger.warn('Airport config service not available for operational knowledge retrieval');
      return;
    }
    
    try {
      // Handle capacity-related intents
      if (intent.startsWith('capacity.')) {
        if (intent === 'capacity.current') {
          // Get operational settings
          const settings = await this.airportConfigService.getOperationalSettings();
          if (settings) {
            results.facts.push({
              type: 'operational-settings',
              data: settings,
              source: 'airport-config-service'
            });
          }
        }
      }
      
      // Handle operational settings
      if (intent === 'operational.settings') {
        const settings = await this.airportConfigService.getOperationalSettings();
        if (settings) {
          results.facts.push({
            type: 'operational-settings',
            data: settings,
            source: 'airport-config-service'
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error retrieving operational knowledge: ${error.message}`, error);
    }
  }
  
  /**
   * Format the retrieved knowledge results
   * 
   * @param {Object} results - The raw results
   * @param {string} strategy - The retrieval strategy used
   * @param {Object} options - Formatting options
   * @returns {Object} - The formatted results
   */
  formatResults(results, strategy, options) {
    const includeMetadata = options.includeMetadata !== undefined 
      ? options.includeMetadata 
      : this.includeMetadata;
    
    if (!includeMetadata) {
      // Remove metadata fields
      return {
        facts: results.facts.map(item => item.data),
        contextual: results.contextual.map(item => item.content)
      };
    }
    
    // Include useful metadata
    return {
      facts: results.facts,
      contextual: results.contextual,
      metadata: {
        retrievalStrategy: strategy,
        timestamp: new Date().toISOString(),
        factCount: results.facts.length,
        contextualCount: results.contextual.length
      }
    };
  }
  
  /**
   * Get the category for a specific intent
   * 
   * @param {string} intent - The intent
   * @returns {string|null} - The category or null if not found
   */
  getIntentCategory(intent) {
    const categories = {
      asset: [
        'stand.details', 'stand.info', 'stand.status', 'stand.find',
        'stand.location', 'stand.nearest', 'terminal.stands', 'pier.stands',
        'stand.capability', 'stand.aircraft', 'aircraft.stands', 'stand.equipment'
      ],
      reference: [
        'airport.info', 'airport.details', 'airport.search', 'airport.list',
        'airline.info', 'airline.details', 'airline.search', 'airline.list', 'route.airlines',
        'gha.info', 'gha.details', 'gha.search', 'gha.list', 'airline.gha', 'airport.gha',
        'aircraft.info', 'aircraft.details', 'aircraft.search', 'aircraft.list', 'aircraft.size'
      ],
      maintenance: [
        'maintenance.status', 'maintenance.schedule', 'maintenance.request',
        'maintenance.impact', 'maintenance.upcoming', 'stand.maintenance'
      ],
      operational: [
        'capacity.current', 'capacity.forecast', 'capacity.impact',
        'allocation.status', 'allocation.conflicts', 'operational.settings'
      ]
    };
    
    for (const [category, intents] of Object.entries(categories)) {
      if (intents.includes(intent)) {
        return category;
      }
    }
    
    return null;
  }
  
  /**
   * Get performance metrics
   * 
   * @returns {Object} - Performance metrics
   */
  getMetrics() {
    const avgTime = this.metrics.totalQueries > 0 
      ? this.metrics.totalRetrievalTimeMs / this.metrics.totalQueries 
      : 0;
    
    return {
      ...this.metrics,
      averageRetrievalTimeMs: avgTime,
      vectorSearchMetrics: this.vectorSearchService ? this.vectorSearchService.getMetrics() : null
    };
  }
  
  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      vectorSearches: 0,
      structuredQueries: 0,
      combinedQueries: 0,
      totalRetrievalTimeMs: 0,
      cacheHits: 0
    };
    
    if (this.vectorSearchService && typeof this.vectorSearchService.resetMetrics === 'function') {
      this.vectorSearchService.resetMetrics();
    }
  }
}

  /**
   * Extract all unique sources from results
   * 
   * @param {Object} results - The retrieval results
   * @returns {Array<string>} - List of unique sources
   */
  getSourcesFromResults(results) {
    const sources = new Set();
    
    if (results.facts) {
      for (const fact of results.facts) {
        if (fact.source) sources.add(fact.source);
      }
    }
    
    if (results.contextual) {
      for (const item of results.contextual) {
        if (item.source) sources.add(item.source);
      }
    }
    
    return Array.from(sources);
  }
  
  /**
   * Count total number of knowledge items in results
   * 
   * @param {Object} results - The retrieval results
   * @returns {number} - Total count of items
   */
  countItems(results) {
    let count = 0;
    
    if (results.facts) count += results.facts.length;
    if (results.contextual) count += results.contextual.length;
    
    return count;
  }
  
  /**
   * Flatten results structure into a single array of knowledge items
   * 
   * @param {Object} results - The retrieval results
   * @returns {Array} - Flattened array of knowledge items
   */
  flattenResults(results) {
    const items = [];
    
    if (results.facts) {
      for (const fact of results.facts) {
        items.push({
          type: 'fact',
          content: JSON.stringify(fact.data),
          source: fact.source,
          factType: fact.type
        });
      }
    }
    
    if (results.contextual) {
      for (const item of results.contextual) {
        items.push({
          type: 'contextual',
          content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
          source: item.source,
          similarity: item.similarity
        });
      }
    }
    
    return items;
  }

module.exports = KnowledgeRetrievalService;