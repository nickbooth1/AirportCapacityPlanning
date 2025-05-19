/**
 * Ground Handling Agent (GHA) Information Query Handler
 * 
 * Handles queries related to GHA reference data, including:
 * - Looking up GHA details by code or name
 * - Searching for GHAs by location or service type
 * - Finding GHAs that service specific airlines
 */
const ReferenceDataQueryHandler = require('./ReferenceDataQueryHandler');

class GHAInfoQueryHandler extends ReferenceDataQueryHandler {
  /**
   * Create a new GHA info query handler
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the handler
   */
  constructor(services = {}, options = {}) {
    super(services, {
      ...options,
      dataType: 'gha',
      identifierKeys: ['gha', 'code', 'ghaCode', 'ghaId', 'ghaName'],
      defaultFormat: 'summary'
    });
  }
  
  /**
   * Get the types of queries this handler can process
   * 
   * @returns {Array<string>} - Array of query intents this handler can process
   */
  getQueryTypes() {
    return [
      'gha.info',
      'gha.details',
      'gha.search',
      'gha.list',
      'airline.gha',
      'airport.gha'
    ];
  }
  
  /**
   * Check if this handler can handle the given query
   * 
   * @param {Object} parsedQuery - The parsed query object
   * @param {Object} context - The conversation context
   * @returns {boolean} - True if this handler can process the query
   */
  canHandle(parsedQuery, context = {}) {
    // Check parent requirements first
    if (!super.canHandle(parsedQuery, context)) {
      return false;
    }
    
    const entities = parsedQuery.entities || {};
    
    // For gha.info and gha.details, we need a GHA identifier
    if (parsedQuery.intent === 'gha.info' || parsedQuery.intent === 'gha.details') {
      return this.extractIdentifier(entities) !== null;
    }
    
    // For gha.search, we need some search criteria
    if (parsedQuery.intent === 'gha.search') {
      return (
        entities.name !== undefined ||
        entities.country !== undefined ||
        entities.serviceType !== undefined ||
        entities.query !== undefined ||
        entities.searchTerm !== undefined
      );
    }
    
    // For gha.list, no specific entities required
    if (parsedQuery.intent === 'gha.list') {
      return true;
    }
    
    // For airline.gha, we need an airline identifier
    if (parsedQuery.intent === 'airline.gha') {
      return (
        entities.airline !== undefined ||
        entities.iata !== undefined ||
        entities.icao !== undefined
      );
    }
    
    // For airport.gha, we need an airport identifier
    if (parsedQuery.intent === 'airport.gha') {
      return (
        entities.airport !== undefined ||
        entities.airportCode !== undefined
      );
    }
    
    return false;
  }
  
  /**
   * Process a query
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} context - The conversation context
   * @returns {Promise<Object>} - The formatted response
   */
  async processQuery(parsedQuery, context = {}) {
    const intent = parsedQuery.intent;
    const entities = parsedQuery.entities || {};
    
    switch (intent) {
      case 'gha.info':
      case 'gha.details':
        return await this.handleGHADetailsQuery(entities);
        
      case 'gha.search':
        return await this.handleGHASearchQuery(entities);
        
      case 'gha.list':
        return await this.handleGHAListQuery(entities);
        
      case 'airline.gha':
        return await this.handleAirlineGHAQuery(entities);
        
      case 'airport.gha':
        return await this.handleAirportGHAQuery(entities);
        
      default:
        return this.createErrorResponse(
          `Unsupported intent: ${intent}`,
          'UNSUPPORTED_INTENT'
        );
    }
  }
  
  /**
   * Handle GHA details query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleGHADetailsQuery(entities) {
    // Extract GHA identifier
    const ghaIdentifier = this.extractIdentifier(entities);
    
    if (!ghaIdentifier) {
      return this.createErrorResponse(
        'GHA identifier is required',
        'MISSING_ENTITY'
      );
    }
    
    // Extract format
    const format = this.extractFormat(entities);
    
    try {
      // Try different lookup methods based on identifier format
      let gha = null;
      
      // ID is usually a number
      if (!isNaN(ghaIdentifier) && Number.isInteger(Number(ghaIdentifier))) {
        gha = await this.referenceDataService.getGroundHandlingAgentById(Number(ghaIdentifier));
      }
      // Code is usually a string
      else if (typeof ghaIdentifier === 'string' && ghaIdentifier.length <= 5) {
        gha = await this.referenceDataService.getGroundHandlingAgentByCode(ghaIdentifier);
      }
      // Name might be a string
      else if (typeof ghaIdentifier === 'string') {
        // Try to find by name
        const ghas = await this.referenceDataService.searchGroundHandlingAgents({
          name: ghaIdentifier
        }, 1);
        
        gha = ghas && ghas.length > 0 ? ghas[0] : null;
      }
      
      if (!gha) {
        return this.createErrorResponse(
          `Ground handling agent ${ghaIdentifier} not found`,
          'NOT_FOUND',
          { ghaIdentifier }
        );
      }
      
      return this.createItemResponse(gha, format, {
        ghaIdentifier
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving GHA details: ${error.message}`,
        'SERVICE_ERROR',
        { ghaIdentifier }
      );
    }
  }
  
  /**
   * Handle GHA search query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleGHASearchQuery(entities) {
    // Extract search criteria
    const criteria = {};
    
    // Check for various search terms
    const searchTerm = this.getEntityValue(
      entities,
      'query',
      ['searchTerm', 'term', 'q'],
      null
    );
    
    if (searchTerm) {
      criteria.searchTerm = searchTerm;
    }
    
    if (entities.name) criteria.name = entities.name;
    if (entities.country) criteria.country = entities.country;
    if (entities.serviceType) criteria.serviceType = entities.serviceType;
    if (entities.active !== undefined) criteria.active = entities.active;
    
    // If no criteria provided, return error
    if (Object.keys(criteria).length === 0) {
      return this.createErrorResponse(
        'Search criteria required',
        'MISSING_ENTITY'
      );
    }
    
    // Extract format and limit
    const format = this.extractFormat(entities);
    const limit = this.extractLimit(entities);
    
    try {
      // Search for GHAs
      const ghas = await this.referenceDataService.searchGroundHandlingAgents(criteria, limit);
      
      return this.createListResponse(ghas, format, criteria, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error searching ground handling agents: ${error.message}`,
        'SERVICE_ERROR',
        { criteria }
      );
    }
  }
  
  /**
   * Handle GHA list query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleGHAListQuery(entities) {
    // Extract filter criteria
    const filters = {};
    
    if (entities.country) filters.country = entities.country;
    if (entities.serviceType) filters.serviceType = entities.serviceType;
    if (entities.active !== undefined) filters.active = entities.active;
    
    // Extract format and limit
    const format = this.extractFormat(entities);
    const limit = this.extractLimit(entities);
    
    try {
      // Get GHAs with filters
      const ghas = await this.referenceDataService.getGroundHandlingAgents(filters, limit);
      
      return this.createListResponse(ghas, format, filters, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error listing ground handling agents: ${error.message}`,
        'SERVICE_ERROR',
        { filters }
      );
    }
  }
  
  /**
   * Handle airline.gha intent
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAirlineGHAQuery(entities) {
    // Extract airline identifier
    const airlineIdentifier = this.getEntityValue(
      entities,
      'airline',
      ['iata', 'icao', 'airlineCode'],
      null
    );
    
    if (!airlineIdentifier) {
      return this.createErrorResponse(
        'Airline identifier is required',
        'MISSING_ENTITY'
      );
    }
    
    // Extract format and limit
    const format = this.extractFormat(entities);
    const limit = this.extractLimit(entities);
    
    try {
      // Check if the reference data service has a method for this
      if (typeof this.referenceDataService.getGroundHandlingAgentsForAirline !== 'function') {
        return this.createErrorResponse(
          'Airline GHA lookup not supported',
          'UNSUPPORTED_FEATURE'
        );
      }
      
      // Get GHAs for the airline
      const ghas = await this.referenceDataService.getGroundHandlingAgentsForAirline(
        airlineIdentifier,
        limit
      );
      
      return this.createListResponse(ghas, format, { airlineIdentifier }, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error finding GHAs for airline: ${error.message}`,
        'SERVICE_ERROR',
        { airlineIdentifier }
      );
    }
  }
  
  /**
   * Handle airport.gha intent
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAirportGHAQuery(entities) {
    // Extract airport identifier
    const airportIdentifier = this.getEntityValue(
      entities,
      'airport',
      ['airportCode', 'airportId'],
      null
    );
    
    if (!airportIdentifier) {
      return this.createErrorResponse(
        'Airport identifier is required',
        'MISSING_ENTITY'
      );
    }
    
    // Extract format and limit
    const format = this.extractFormat(entities);
    const limit = this.extractLimit(entities);
    
    try {
      // Check if the reference data service has a method for this
      if (typeof this.referenceDataService.getGroundHandlingAgentsForAirport !== 'function') {
        return this.createErrorResponse(
          'Airport GHA lookup not supported',
          'UNSUPPORTED_FEATURE'
        );
      }
      
      // Get GHAs for the airport
      const ghas = await this.referenceDataService.getGroundHandlingAgentsForAirport(
        airportIdentifier,
        limit
      );
      
      return this.createListResponse(ghas, format, { airportIdentifier }, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error finding GHAs for airport: ${error.message}`,
        'SERVICE_ERROR',
        { airportIdentifier }
      );
    }
  }
  
  /**
   * Format GHA data based on the requested format
   * 
   * @param {Object} gha - The GHA data
   * @param {string} format - The format to use ('simple', 'summary', 'detailed')
   * @returns {Object} - The formatted GHA data
   */
  formatReferenceData(gha, format = 'summary') {
    // Use data transformer if available
    if (this.dataTransformer && typeof this.dataTransformer.transformGHAData === 'function') {
      return this.dataTransformer.transformGHAData(gha, format);
    }
    
    // Otherwise, do basic formatting
    switch (format.toLowerCase()) {
      case 'simple':
        return {
          id: gha.id,
          code: gha.code,
          name: gha.name
        };
        
      case 'summary':
        return {
          id: gha.id,
          code: gha.code,
          name: gha.name,
          country: gha.country,
          active: !!gha.active,
          serviceTypes: gha.serviceTypes || []
        };
        
      case 'detailed':
      default:
        return {
          id: gha.id,
          code: gha.code,
          name: gha.name,
          fullName: gha.fullName || gha.name,
          country: gha.country,
          headquarters: gha.headquarters,
          website: gha.website,
          active: !!gha.active,
          serviceTypes: gha.serviceTypes || [],
          airportsCovered: gha.airportsCovered || [],
          airlinesServed: gha.airlinesServed || [],
          specializations: gha.specializations || []
        };
    }
  }
}

module.exports = GHAInfoQueryHandler;