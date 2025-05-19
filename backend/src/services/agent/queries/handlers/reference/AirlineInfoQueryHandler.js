/**
 * Airline Information Query Handler
 * 
 * Handles queries related to airline reference data, including:
 * - Looking up airline details by IATA/ICAO code
 * - Searching for airlines by name or country
 * - Getting information about airlines serving specific routes
 */
const ReferenceDataQueryHandler = require('./ReferenceDataQueryHandler');

class AirlineInfoQueryHandler extends ReferenceDataQueryHandler {
  /**
   * Create a new airline info query handler
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the handler
   */
  constructor(services = {}, options = {}) {
    super(services, {
      ...options,
      dataType: 'airline',
      identifierKeys: ['airline', 'iata', 'icao', 'airlineCode'],
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
      'airline.info',
      'airline.details',
      'airline.search',
      'airline.list',
      'route.airlines'
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
    
    // For airline.info and airline.details, we need an airline identifier
    if (parsedQuery.intent === 'airline.info' || parsedQuery.intent === 'airline.details') {
      return this.extractIdentifier(entities) !== null;
    }
    
    // For airline.search, we need some search criteria
    if (parsedQuery.intent === 'airline.search') {
      return (
        entities.name !== undefined ||
        entities.country !== undefined ||
        entities.alliance !== undefined ||
        entities.query !== undefined ||
        entities.searchTerm !== undefined
      );
    }
    
    // For airline.list, no specific entities required
    if (parsedQuery.intent === 'airline.list') {
      return true;
    }
    
    // For route.airlines, we need origin and destination
    if (parsedQuery.intent === 'route.airlines') {
      return (
        (entities.origin !== undefined && entities.destination !== undefined) ||
        entities.route !== undefined
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
      case 'airline.info':
      case 'airline.details':
        return await this.handleAirlineDetailsQuery(entities);
        
      case 'airline.search':
        return await this.handleAirlineSearchQuery(entities);
        
      case 'airline.list':
        return await this.handleAirlineListQuery(entities);
        
      case 'route.airlines':
        return await this.handleRouteAirlinesQuery(entities);
        
      default:
        return this.createErrorResponse(
          `Unsupported intent: ${intent}`,
          'UNSUPPORTED_INTENT'
        );
    }
  }
  
  /**
   * Handle airline details query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAirlineDetailsQuery(entities) {
    // Extract airline identifier
    const airlineIdentifier = this.extractIdentifier(entities);
    
    if (!airlineIdentifier) {
      return this.createErrorResponse(
        'Airline identifier is required',
        'MISSING_ENTITY'
      );
    }
    
    // Extract format
    const format = this.extractFormat(entities);
    
    try {
      // Try different lookup methods based on identifier format
      let airline = null;
      
      // IATA code is usually 2 letters
      if (typeof airlineIdentifier === 'string' && airlineIdentifier.length === 2) {
        airline = await this.referenceDataService.getAirlineByIATA(airlineIdentifier);
      } 
      // ICAO code is usually 3 letters
      else if (typeof airlineIdentifier === 'string' && airlineIdentifier.length === 3) {
        airline = await this.referenceDataService.getAirlineByICAO(airlineIdentifier);
      }
      // ID is usually a number
      else if (!isNaN(airlineIdentifier) && Number.isInteger(Number(airlineIdentifier))) {
        airline = await this.referenceDataService.getAirlineById(Number(airlineIdentifier));
      }
      // Name might be a string
      else if (typeof airlineIdentifier === 'string') {
        // Try to find by name
        const airlines = await this.referenceDataService.searchAirlines({
          name: airlineIdentifier
        }, 1);
        
        airline = airlines && airlines.length > 0 ? airlines[0] : null;
      }
      
      if (!airline) {
        return this.createErrorResponse(
          `Airline ${airlineIdentifier} not found`,
          'NOT_FOUND',
          { airlineIdentifier }
        );
      }
      
      return this.createItemResponse(airline, format, {
        airlineIdentifier
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving airline details: ${error.message}`,
        'SERVICE_ERROR',
        { airlineIdentifier }
      );
    }
  }
  
  /**
   * Handle airline search query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAirlineSearchQuery(entities) {
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
    if (entities.alliance) criteria.alliance = entities.alliance;
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
      // Search for airlines
      const airlines = await this.referenceDataService.searchAirlines(criteria, limit);
      
      return this.createListResponse(airlines, format, criteria, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error searching airlines: ${error.message}`,
        'SERVICE_ERROR',
        { criteria }
      );
    }
  }
  
  /**
   * Handle airline list query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAirlineListQuery(entities) {
    // Extract filter criteria
    const filters = {};
    
    if (entities.country) filters.country = entities.country;
    if (entities.alliance) filters.alliance = entities.alliance;
    if (entities.active !== undefined) filters.active = entities.active;
    
    // Extract format and limit
    const format = this.extractFormat(entities);
    const limit = this.extractLimit(entities);
    
    try {
      // Get airlines with filters
      const airlines = await this.referenceDataService.getAirlines(filters, limit);
      
      return this.createListResponse(airlines, format, filters, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error listing airlines: ${error.message}`,
        'SERVICE_ERROR',
        { filters }
      );
    }
  }
  
  /**
   * Handle route.airlines intent
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleRouteAirlinesQuery(entities) {
    // Extract route information
    let origin = entities.origin;
    let destination = entities.destination;
    
    // If a route is provided, try to parse it
    if (entities.route && !origin && !destination) {
      const routeParts = entities.route.split('-');
      if (routeParts.length === 2) {
        [origin, destination] = routeParts;
      }
    }
    
    if (!origin || !destination) {
      return this.createErrorResponse(
        'Origin and destination are required',
        'MISSING_ENTITY'
      );
    }
    
    // Extract format and limit
    const format = this.extractFormat(entities);
    const limit = this.extractLimit(entities);
    
    try {
      // Check if the reference data service has a method for this
      if (typeof this.referenceDataService.getAirlinesForRoute !== 'function') {
        return this.createErrorResponse(
          'Route airline lookup not supported',
          'UNSUPPORTED_FEATURE'
        );
      }
      
      // Get airlines for the route
      const airlines = await this.referenceDataService.getAirlinesForRoute(origin, destination, limit);
      
      return this.createListResponse(airlines, format, { origin, destination }, {
        limit,
        route: `${origin}-${destination}`
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error finding airlines for route: ${error.message}`,
        'SERVICE_ERROR',
        { origin, destination }
      );
    }
  }
  
  /**
   * Format airline data based on the requested format
   * 
   * @param {Object} airline - The airline data
   * @param {string} format - The format to use ('simple', 'summary', 'detailed')
   * @returns {Object} - The formatted airline data
   */
  formatReferenceData(airline, format = 'summary') {
    // Use data transformer if available
    if (this.dataTransformer && typeof this.dataTransformer.transformAirlineData === 'function') {
      return this.dataTransformer.transformAirlineData(airline, format);
    }
    
    // Otherwise, do basic formatting
    switch (format.toLowerCase()) {
      case 'simple':
        return {
          iata: airline.iata,
          name: airline.name
        };
        
      case 'summary':
        return {
          id: airline.id,
          iata: airline.iata,
          icao: airline.icao,
          name: airline.name,
          country: airline.country,
          active: !!airline.active
        };
        
      case 'detailed':
      default:
        return {
          id: airline.id,
          iata: airline.iata,
          icao: airline.icao,
          name: airline.name,
          country: airline.country,
          active: !!airline.active,
          headquarters: airline.headquarters,
          website: airline.website,
          alliance: airline.alliance,
          foundedYear: airline.foundedYear,
          fleet: airline.fleet,
          destinations: airline.destinations
        };
    }
  }
}

module.exports = AirlineInfoQueryHandler;