/**
 * Airport Information Query Handler
 * 
 * Handles queries related to airport reference data, including:
 * - Looking up airport details by IATA/ICAO code
 * - Searching for airports by name, city, or country
 * - Getting information about all airports in a region
 */
const ReferenceDataQueryHandler = require('./ReferenceDataQueryHandler');

class AirportInfoQueryHandler extends ReferenceDataQueryHandler {
  /**
   * Create a new airport info query handler
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the handler
   */
  constructor(services = {}, options = {}) {
    super(services, {
      ...options,
      dataType: 'airport',
      identifierKeys: ['airport', 'iata', 'icao', 'airportCode'],
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
      'airport.info',
      'airport.details',
      'airport.search',
      'airport.list'
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
    
    // For airport.info and airport.details, we need an airport identifier
    if (parsedQuery.intent === 'airport.info' || parsedQuery.intent === 'airport.details') {
      return this.extractIdentifier(entities) !== null;
    }
    
    // For airport.search, we need some search criteria
    if (parsedQuery.intent === 'airport.search') {
      return (
        entities.name !== undefined ||
        entities.city !== undefined ||
        entities.country !== undefined ||
        entities.region !== undefined ||
        entities.query !== undefined ||
        entities.searchTerm !== undefined
      );
    }
    
    // For airport.list, no specific entities required
    if (parsedQuery.intent === 'airport.list') {
      return true;
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
      case 'airport.info':
      case 'airport.details':
        return await this.handleAirportDetailsQuery(entities);
        
      case 'airport.search':
        return await this.handleAirportSearchQuery(entities);
        
      case 'airport.list':
        return await this.handleAirportListQuery(entities);
        
      default:
        return this.createErrorResponse(
          `Unsupported intent: ${intent}`,
          'UNSUPPORTED_INTENT'
        );
    }
  }
  
  /**
   * Handle airport details query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAirportDetailsQuery(entities) {
    // Extract airport identifier
    const airportIdentifier = this.extractIdentifier(entities);
    
    if (!airportIdentifier) {
      return this.createErrorResponse(
        'Airport identifier is required',
        'MISSING_ENTITY'
      );
    }
    
    // Extract format
    const format = this.extractFormat(entities);
    
    try {
      // Try different lookup methods based on identifier format
      let airport = null;
      
      // IATA code is usually 3 letters
      if (typeof airportIdentifier === 'string' && airportIdentifier.length === 3) {
        airport = await this.referenceDataService.getAirportByIATA(airportIdentifier);
      } 
      // ICAO code is usually 4 letters
      else if (typeof airportIdentifier === 'string' && airportIdentifier.length === 4) {
        airport = await this.referenceDataService.getAirportByICAO(airportIdentifier);
      }
      // ID is usually a number
      else if (!isNaN(airportIdentifier) && Number.isInteger(Number(airportIdentifier))) {
        airport = await this.referenceDataService.getAirportById(Number(airportIdentifier));
      }
      // Name might be a string
      else if (typeof airportIdentifier === 'string') {
        // Try to find by name
        const airports = await this.referenceDataService.searchAirports({
          name: airportIdentifier
        }, 1);
        
        airport = airports && airports.length > 0 ? airports[0] : null;
      }
      
      if (!airport) {
        return this.createErrorResponse(
          `Airport ${airportIdentifier} not found`,
          'NOT_FOUND',
          { airportIdentifier }
        );
      }
      
      return this.createItemResponse(airport, format, {
        airportIdentifier
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving airport details: ${error.message}`,
        'SERVICE_ERROR',
        { airportIdentifier }
      );
    }
  }
  
  /**
   * Handle airport search query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAirportSearchQuery(entities) {
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
    if (entities.city) criteria.city = entities.city;
    if (entities.country) criteria.country = entities.country;
    if (entities.region) criteria.region = entities.region;
    
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
      // Search for airports
      const airports = await this.referenceDataService.searchAirports(criteria, limit);
      
      return this.createListResponse(airports, format, criteria, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error searching airports: ${error.message}`,
        'SERVICE_ERROR',
        { criteria }
      );
    }
  }
  
  /**
   * Handle airport list query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAirportListQuery(entities) {
    // Extract filter criteria
    const filters = {};
    
    if (entities.country) filters.country = entities.country;
    if (entities.region) filters.region = entities.region;
    if (entities.hub) filters.hub = entities.hub;
    if (entities.international !== undefined) filters.international = entities.international;
    
    // Extract format and limit
    const format = this.extractFormat(entities);
    const limit = this.extractLimit(entities);
    
    try {
      // Get airports with filters
      const airports = await this.referenceDataService.getAirports(filters, limit);
      
      return this.createListResponse(airports, format, filters, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error listing airports: ${error.message}`,
        'SERVICE_ERROR',
        { filters }
      );
    }
  }
  
  /**
   * Format airport data based on the requested format
   * 
   * @param {Object} airport - The airport data
   * @param {string} format - The format to use ('simple', 'summary', 'detailed')
   * @returns {Object} - The formatted airport data
   */
  formatReferenceData(airport, format = 'summary') {
    // Use data transformer if available
    if (this.dataTransformer && typeof this.dataTransformer.transformAirportData === 'function') {
      return this.dataTransformer.transformAirportData(airport, format);
    }
    
    // Otherwise, do basic formatting
    switch (format.toLowerCase()) {
      case 'simple':
        return {
          iata: airport.iata,
          name: airport.name,
          city: airport.city,
          country: airport.country
        };
        
      case 'summary':
        return {
          id: airport.id,
          iata: airport.iata,
          icao: airport.icao,
          name: airport.name,
          city: airport.city,
          country: airport.country,
          latitude: airport.latitude,
          longitude: airport.longitude
        };
        
      case 'detailed':
      default:
        return {
          id: airport.id,
          iata: airport.iata,
          icao: airport.icao,
          name: airport.name,
          city: airport.city,
          country: airport.country,
          latitude: airport.latitude,
          longitude: airport.longitude,
          timezone: airport.timezone,
          elevation: airport.elevation,
          terminals: airport.terminals,
          runways: airport.runways,
          international: !!airport.international,
          hub: !!airport.hub
        };
    }
  }
}

module.exports = AirportInfoQueryHandler;