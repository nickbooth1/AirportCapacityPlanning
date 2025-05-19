/**
 * Airport Domain Processor
 * 
 * This class provides domain-specific processing for airport-related queries.
 * It applies industry knowledge and context to enhance parsed queries with
 * additional information and perform domain-specific validations.
 */

const NLPProcessorBase = require('./NLPProcessorBase');

class AirportDomainProcessor extends NLPProcessorBase {
  /**
   * Create a new airport domain processor
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the processor
   */
  constructor(services = {}, options = {}) {
    super(services, options);
    
    // Reference services for domain knowledge
    this.standDataService = services.standDataService || 
      (services.knowledgeServices ? services.knowledgeServices.StandDataService : null);
    this.airportService = services.airportService;
    this.airlineService = services.airlineService;
    this.referenceDataService = services.referenceDataService || 
      (services.knowledgeServices ? services.knowledgeServices.ReferenceDataService : null);
    
    // Configuration
    this.defaultAirport = options.defaultAirport || 'LHR';
    this.contextEnabled = options.contextEnabled !== undefined ? options.contextEnabled : true;
    
    // Domain rules
    this.intentEntityRequirements = this.getIntentEntityRequirements();
    this.entityRelationships = this.getEntityRelationships();
    this.airportContextRules = this.getAirportContextRules();
  }
  
  /**
   * Get intent-entity requirements
   * 
   * @returns {Object} - Entity requirements by intent
   */
  getIntentEntityRequirements() {
    return {
      'stand.details': {
        required: ['stand'],
        optional: ['format', 'date']
      },
      'stand.status': {
        required: ['stand'],
        optional: ['date', 'time']
      },
      'stand.location': {
        required: ['stand'],
        optional: []
      },
      'stand.nearest': {
        required: [], // Either coordinates or referencePoint
        optional: ['latitude', 'longitude', 'referencePoint', 'limit', 'available', 'type']
      },
      'terminal.stands': {
        required: ['terminal'],
        optional: ['available', 'type', 'format', 'limit']
      },
      'pier.stands': {
        required: ['pier'],
        optional: ['terminal', 'available', 'format', 'limit']
      },
      'stand.capability': {
        required: ['stand'],
        optional: ['format']
      },
      'stand.aircraft': {
        required: ['stand'],
        optional: ['format', 'limit']
      },
      'aircraft.stands': {
        required: [], // Either aircraftType or aircraftSize
        optional: ['aircraftType', 'aircraftSize', 'available', 'terminal', 'pier', 'format', 'limit']
      },
      'stand.equipment': {
        required: ['stand'],
        optional: ['format']
      },
      'airport.info': {
        required: ['airport'],
        optional: ['format']
      },
      'airport.details': {
        required: ['airport'],
        optional: ['format']
      },
      'airport.search': {
        required: [], // At least one search criteria
        optional: ['name', 'city', 'country', 'region', 'query', 'searchTerm', 'format', 'limit']
      },
      'airline.info': {
        required: ['airline'],
        optional: ['format']
      },
      'aircraft.info': {
        required: ['aircraftType'],
        optional: ['format']
      },
      'aircraft.size': {
        required: ['size'],
        optional: ['format', 'limit']
      }
    };
  }
  
  /**
   * Get entity relationships for domain knowledge
   * 
   * @returns {Object} - Entity relationships
   */
  getEntityRelationships() {
    return {
      'stand': {
        related: ['terminal', 'pier'],
        inferFrom: ['terminal', 'pier'],
        locationBased: true
      },
      'terminal': {
        related: ['airport', 'pier'],
        inferFrom: ['airport'],
        locationBased: true
      },
      'pier': {
        related: ['terminal', 'airport'],
        inferFrom: ['terminal', 'airport'],
        locationBased: true
      },
      'aircraft': {
        related: ['aircraftType', 'airline'],
        inferFrom: ['aircraftType', 'airline'],
        operationalEntity: true
      },
      'airline': {
        related: ['aircraft', 'airport'],
        inferFrom: [],
        operationalEntity: true
      }
    };
  }
  
  /**
   * Get airport context rules
   * 
   * @returns {Object} - Airport context rules
   */
  getAirportContextRules() {
    return {
      defaultEntities: {
        'airport': this.defaultAirport
      },
      entityHierarchy: [
        'airport',
        'terminal',
        'pier',
        'stand'
      ],
      timeWindow: {
        pastHours: 2,
        futureHours: 24
      }
    };
  }
  
  /**
   * Process a parsed query with domain-specific knowledge
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Enhanced query
   */
  async process(parsedQuery, context = {}) {
    return this.trackPerformance(async () => {
      try {
        // Copy the original query to avoid modifying it
        const enhancedQuery = { ...parsedQuery };
        
        // Basic validation
        if (!enhancedQuery.intent) {
          return this.createErrorResult(
            'Missing intent in query',
            'INVALID_QUERY'
          );
        }
        
        // Apply context if enabled
        if (this.contextEnabled && context) {
          enhancedQuery.entities = await this.applyContextToEntities(
            enhancedQuery.entities || {},
            context
          );
        }
        
        // Apply default entities
        enhancedQuery.entities = this.applyDefaultEntities(enhancedQuery.entities || {});
        
        // Apply domain-specific entity inference
        enhancedQuery.entities = await this.inferEntities(enhancedQuery.entities, enhancedQuery.intent);
        
        // Validate against intent requirements
        const validationResult = this.validateAgainstRequirements(enhancedQuery);
        
        if (!validationResult.valid) {
          return this.createErrorResult(
            `Query validation failed: ${validationResult.reason}`,
            'VALIDATION_FAILED',
            {
              missingRequired: validationResult.missingRequired,
              intent: enhancedQuery.intent
            }
          );
        }
        
        // Add domain-specific metadata
        const metadata = await this.generateDomainMetadata(enhancedQuery);
        
        return this.createSuccessResult(enhancedQuery, {
          original: parsedQuery,
          enhancedEntities: Object.keys(enhancedQuery.entities || {}),
          domainMetadata: metadata
        });
      } catch (error) {
        this.logger.error(`Error in domain processing: ${error.message}`);
        return this.createErrorResult(
          `Domain processing error: ${error.message}`,
          'PROCESSING_ERROR'
        );
      }
    }, 'domain processing');
  }
  
  /**
   * Apply conversation context to entities
   * 
   * @param {Object} entities - Extracted entities
   * @param {Object} context - Conversation context
   * @returns {Promise<Object>} - Enhanced entities
   */
  async applyContextToEntities(entities, context) {
    const enhancedEntities = { ...entities };
    
    // Check for entities in the context
    if (context.entities) {
      // Apply hierarchical entities from context if missing in current query
      for (const entityType of this.airportContextRules.entityHierarchy) {
        if (!enhancedEntities[entityType] && context.entities[entityType]) {
          enhancedEntities[entityType] = context.entities[entityType];
        }
      }
    }
    
    // Apply location context from recent queries
    if (context.recentQueries && context.recentQueries.length > 0) {
      // Get most recent query with location entities
      const recentLocationQuery = context.recentQueries
        .filter(q => q.entities && this.hasLocationEntities(q.entities))
        .shift();
      
      if (recentLocationQuery) {
        // Apply missing location entities from recent query
        for (const entityType of this.airportContextRules.entityHierarchy) {
          if (!enhancedEntities[entityType] && 
              recentLocationQuery.entities && 
              recentLocationQuery.entities[entityType]) {
            enhancedEntities[entityType] = recentLocationQuery.entities[entityType];
          }
        }
      }
    }
    
    // If no date/time specified, apply current time context
    if (!enhancedEntities.date) {
      enhancedEntities.date = new Date().toISOString().split('T')[0];
      enhancedEntities._dateFromContext = true;
    }
    
    return enhancedEntities;
  }
  
  /**
   * Apply default entities
   * 
   * @param {Object} entities - Extracted entities
   * @returns {Object} - Entities with defaults applied
   */
  applyDefaultEntities(entities) {
    const enhanced = { ...entities };
    const defaults = this.airportContextRules.defaultEntities;
    
    // Apply default values for missing entities
    for (const [entityType, defaultValue] of Object.entries(defaults)) {
      if (!enhanced[entityType]) {
        enhanced[entityType] = defaultValue;
        enhanced[`_${entityType}FromDefault`] = true;
      }
    }
    
    return enhanced;
  }
  
  /**
   * Infer entities based on domain knowledge
   * 
   * @param {Object} entities - Existing entities
   * @param {string} intent - Query intent
   * @returns {Promise<Object>} - Enhanced entities
   */
  async inferEntities(entities, intent) {
    const enhanced = { ...entities };
    
    // Check if we can infer entities based on relationships
    for (const [entityType, config] of Object.entries(this.entityRelationships)) {
      // Skip if entity already exists
      if (enhanced[entityType]) continue;
      
      // Check if we can infer from related entities
      for (const sourceType of config.inferFrom) {
        if (enhanced[sourceType]) {
          const inferred = await this.inferEntityFromSource(
            entityType, 
            sourceType, 
            enhanced[sourceType]
          );
          
          if (inferred) {
            enhanced[entityType] = inferred;
            enhanced[`_${entityType}Inferred`] = true;
            break;
          }
        }
      }
    }
    
    return enhanced;
  }
  
  /**
   * Infer an entity from a source entity
   * 
   * @param {string} targetType - Target entity type
   * @param {string} sourceType - Source entity type
   * @param {*} sourceValue - Source entity value
   * @returns {Promise<*>} - Inferred entity value or null
   */
  async inferEntityFromSource(targetType, sourceType, sourceValue) {
    // Handle specific inference cases
    if (targetType === 'terminal' && sourceType === 'stand') {
      // Try to get terminal from stand
      if (this.standDataService) {
        try {
          const stand = await this.standDataService.getStandByName(sourceValue);
          if (stand && stand.terminal) {
            return stand.terminal;
          }
        } catch (error) {
          this.logger.warn(`Error inferring terminal from stand: ${error.message}`);
        }
      }
    }
    
    if (targetType === 'pier' && sourceType === 'stand') {
      // Try to get pier from stand
      if (this.standDataService) {
        try {
          const stand = await this.standDataService.getStandByName(sourceValue);
          if (stand && stand.pier) {
            return stand.pier;
          }
        } catch (error) {
          this.logger.warn(`Error inferring pier from stand: ${error.message}`);
        }
      }
    }
    
    if (targetType === 'aircraftSize' && sourceType === 'aircraftType') {
      // Try to get size from aircraft type
      if (this.referenceDataService) {
        try {
          const aircraft = await this.referenceDataService.getAircraftTypeByIATA(sourceValue);
          if (aircraft && aircraft.sizeCategory) {
            return aircraft.sizeCategory;
          }
        } catch (error) {
          this.logger.warn(`Error inferring aircraft size from type: ${error.message}`);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Validate query against intent requirements
   * 
   * @param {Object} query - The query to validate
   * @returns {Object} - Validation result
   */
  validateAgainstRequirements(query) {
    const intent = query.intent;
    const entities = query.entities || {};
    
    // Check if we have requirements for this intent
    const requirements = this.intentEntityRequirements[intent];
    
    if (!requirements) {
      // No specific requirements, consider valid
      return { valid: true };
    }
    
    // Check required entities
    const missingRequired = [];
    
    for (const requiredEntity of requirements.required) {
      if (entities[requiredEntity] === undefined) {
        missingRequired.push(requiredEntity);
      }
    }
    
    // Special case handling for intents with alternative requirements
    if (intent === 'stand.nearest') {
      // If we have coordinates or reference point, consider it valid
      if ((entities.latitude && entities.longitude) || entities.referencePoint) {
        return { valid: true };
      }
      
      if (missingRequired.length > 0) {
        missingRequired.push('coordinates or referencePoint');
      }
    }
    
    if (intent === 'aircraft.stands') {
      // Need either aircraft type or size
      if (entities.aircraftType || entities.aircraftSize) {
        return { valid: true };
      }
      
      if (missingRequired.length > 0) {
        missingRequired.push('aircraftType or aircraftSize');
      }
    }
    
    if (intent === 'airport.search') {
      // Need at least one search criteria
      const searchCriteria = ['name', 'city', 'country', 'region', 'query', 'searchTerm'];
      const hasSearchCriteria = searchCriteria.some(criteria => entities[criteria]);
      
      if (hasSearchCriteria) {
        return { valid: true };
      }
      
      if (missingRequired.length > 0) {
        missingRequired.push('at least one search criteria');
      }
    }
    
    // If any required entities are missing, the query is invalid
    if (missingRequired.length > 0) {
      return {
        valid: false,
        reason: `Missing required entities: ${missingRequired.join(', ')}`,
        missingRequired
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Generate domain-specific metadata for the query
   * 
   * @param {Object} query - The processed query
   * @returns {Promise<Object>} - Domain metadata
   */
  async generateDomainMetadata(query) {
    const metadata = {
      category: this.getIntentCategory(query.intent),
      locationBased: this.isLocationBasedQuery(query),
      timeDependent: this.isTimeDependentQuery(query)
    };
    
    // Add airport information if available
    if (query.entities.airport) {
      try {
        if (this.airportService) {
          const airport = await this.airportService.getAirportByIATA(query.entities.airport);
          if (airport) {
            metadata.airport = {
              iata: airport.iata,
              name: airport.name
            };
          }
        }
      } catch (error) {
        this.logger.warn(`Error fetching airport metadata: ${error.message}`);
      }
    }
    
    return metadata;
  }
  
  /**
   * Get intent category
   * 
   * @param {string} intent - The intent
   * @returns {string|null} - Intent category
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
   * Check if query has location entities
   * 
   * @param {Object} entities - The entities
   * @returns {boolean} - True if has location entities
   */
  hasLocationEntities(entities) {
    const locationEntities = ['airport', 'terminal', 'pier', 'stand'];
    return locationEntities.some(entityType => entities[entityType]);
  }
  
  /**
   * Check if query is location-based
   * 
   * @param {Object} query - The query
   * @returns {boolean} - True if location-based
   */
  isLocationBasedQuery(query) {
    // Check intent category
    const category = this.getIntentCategory(query.intent);
    if (category === 'asset') return true;
    
    // Check for location entities
    return this.hasLocationEntities(query.entities);
  }
  
  /**
   * Check if query is time-dependent
   * 
   * @param {Object} query - The query
   * @returns {boolean} - True if time-dependent
   */
  isTimeDependentQuery(query) {
    // Check for time-related entities
    const timeEntities = ['date', 'time', 'duration'];
    const hasTimeEntities = timeEntities.some(entityType => query.entities[entityType]);
    
    // Check for time-dependent intents
    const timeDependentIntents = [
      'stand.status', 'maintenance.status', 'capacity.current', 'capacity.forecast',
      'allocation.status', 'maintenance.schedule', 'maintenance.upcoming'
    ];
    
    return hasTimeEntities || timeDependentIntents.includes(query.intent);
  }
}

module.exports = AirportDomainProcessor;