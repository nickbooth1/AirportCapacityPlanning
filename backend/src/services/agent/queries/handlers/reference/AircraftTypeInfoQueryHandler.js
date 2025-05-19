/**
 * Aircraft Type Information Query Handler
 * 
 * Handles queries related to aircraft type reference data, including:
 * - Looking up aircraft type details by IATA/ICAO code
 * - Searching for aircraft types by characteristics
 * - Getting information about aircraft types by size category
 */
const ReferenceDataQueryHandler = require('./ReferenceDataQueryHandler');

class AircraftTypeInfoQueryHandler extends ReferenceDataQueryHandler {
  /**
   * Create a new aircraft type info query handler
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the handler
   */
  constructor(services = {}, options = {}) {
    super(services, {
      ...options,
      dataType: 'aircraft',
      identifierKeys: ['aircraft', 'aircraftType', 'iata', 'icao'],
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
      'aircraft.info',
      'aircraft.details',
      'aircraft.search',
      'aircraft.list',
      'aircraft.size'
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
    
    // For aircraft.info and aircraft.details, we need an aircraft identifier
    if (parsedQuery.intent === 'aircraft.info' || parsedQuery.intent === 'aircraft.details') {
      return this.extractIdentifier(entities) !== null;
    }
    
    // For aircraft.search, we need some search criteria
    if (parsedQuery.intent === 'aircraft.search') {
      return (
        entities.name !== undefined ||
        entities.manufacturer !== undefined ||
        entities.bodyType !== undefined ||
        entities.query !== undefined ||
        entities.searchTerm !== undefined
      );
    }
    
    // For aircraft.list, no specific entities required
    if (parsedQuery.intent === 'aircraft.list') {
      return true;
    }
    
    // For aircraft.size, we need a size category
    if (parsedQuery.intent === 'aircraft.size') {
      return (
        entities.size !== undefined ||
        entities.sizeCategory !== undefined ||
        entities.sizeCode !== undefined
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
      case 'aircraft.info':
      case 'aircraft.details':
        return await this.handleAircraftDetailsQuery(entities);
        
      case 'aircraft.search':
        return await this.handleAircraftSearchQuery(entities);
        
      case 'aircraft.list':
        return await this.handleAircraftListQuery(entities);
        
      case 'aircraft.size':
        return await this.handleAircraftSizeQuery(entities);
        
      default:
        return this.createErrorResponse(
          `Unsupported intent: ${intent}`,
          'UNSUPPORTED_INTENT'
        );
    }
  }
  
  /**
   * Handle aircraft details query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAircraftDetailsQuery(entities) {
    // Extract aircraft identifier
    const aircraftIdentifier = this.extractIdentifier(entities);
    
    if (!aircraftIdentifier) {
      return this.createErrorResponse(
        'Aircraft type identifier is required',
        'MISSING_ENTITY'
      );
    }
    
    // Extract format
    const format = this.extractFormat(entities);
    
    try {
      // Try different lookup methods based on identifier format
      let aircraft = null;
      
      // IATA code is usually 3 letters/numbers
      if (typeof aircraftIdentifier === 'string' && aircraftIdentifier.length <= 3) {
        aircraft = await this.referenceDataService.getAircraftTypeByIATA(aircraftIdentifier);
      } 
      // ICAO code is usually 4 letters/numbers
      else if (typeof aircraftIdentifier === 'string' && aircraftIdentifier.length === 4) {
        aircraft = await this.referenceDataService.getAircraftTypeByICAO(aircraftIdentifier);
      }
      // ID is usually a number
      else if (!isNaN(aircraftIdentifier) && Number.isInteger(Number(aircraftIdentifier))) {
        aircraft = await this.referenceDataService.getAircraftTypeById(Number(aircraftIdentifier));
      }
      // Name might be a string
      else if (typeof aircraftIdentifier === 'string') {
        // Try to find by name
        const aircraftTypes = await this.referenceDataService.searchAircraftTypes({
          name: aircraftIdentifier
        }, 1);
        
        aircraft = aircraftTypes && aircraftTypes.length > 0 ? aircraftTypes[0] : null;
      }
      
      if (!aircraft) {
        return this.createErrorResponse(
          `Aircraft type ${aircraftIdentifier} not found`,
          'NOT_FOUND',
          { aircraftIdentifier }
        );
      }
      
      return this.createItemResponse(aircraft, format, {
        aircraftIdentifier
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving aircraft type details: ${error.message}`,
        'SERVICE_ERROR',
        { aircraftIdentifier }
      );
    }
  }
  
  /**
   * Handle aircraft search query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAircraftSearchQuery(entities) {
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
    if (entities.manufacturer) criteria.manufacturer = entities.manufacturer;
    if (entities.bodyType) criteria.bodyType = entities.bodyType;
    if (entities.size || entities.sizeCategory) {
      criteria.sizeCategory = entities.size || entities.sizeCategory;
    }
    
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
      // Search for aircraft types
      const aircraftTypes = await this.referenceDataService.searchAircraftTypes(criteria, limit);
      
      return this.createListResponse(aircraftTypes, format, criteria, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error searching aircraft types: ${error.message}`,
        'SERVICE_ERROR',
        { criteria }
      );
    }
  }
  
  /**
   * Handle aircraft list query
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAircraftListQuery(entities) {
    // Extract filter criteria
    const filters = {};
    
    if (entities.manufacturer) filters.manufacturer = entities.manufacturer;
    if (entities.bodyType) filters.bodyType = entities.bodyType;
    if (entities.size || entities.sizeCategory) {
      filters.sizeCategory = entities.size || entities.sizeCategory;
    }
    
    // Extract format and limit
    const format = this.extractFormat(entities);
    const limit = this.extractLimit(entities);
    
    try {
      // Get aircraft types with filters
      const aircraftTypes = await this.referenceDataService.getAircraftTypes(filters, limit);
      
      return this.createListResponse(aircraftTypes, format, filters, {
        limit
      });
    } catch (error) {
      return this.createErrorResponse(
        `Error listing aircraft types: ${error.message}`,
        'SERVICE_ERROR',
        { filters }
      );
    }
  }
  
  /**
   * Handle aircraft.size intent
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAircraftSizeQuery(entities) {
    // Extract size category
    const sizeCategory = this.getEntityValue(
      entities,
      'size',
      ['sizeCategory', 'sizeCode'],
      null
    );
    
    if (!sizeCategory) {
      return this.createErrorResponse(
        'Aircraft size category is required',
        'MISSING_ENTITY'
      );
    }
    
    // Extract format and limit
    const format = this.extractFormat(entities);
    const limit = this.extractLimit(entities);
    
    try {
      // Get aircraft types for size category
      const aircraftTypes = await this.referenceDataService.getAircraftTypes({
        sizeCategory
      }, limit);
      
      // Get the size category details if available
      let sizeCategoryDetails = null;
      if (typeof this.referenceDataService.getAircraftSizeCategory === 'function') {
        sizeCategoryDetails = await this.referenceDataService.getAircraftSizeCategory(sizeCategory);
      }
      
      // Format the results
      const result = this.createListResponse(aircraftTypes, format, { sizeCategory }, {
        limit
      });
      
      // Add size category details if available
      if (result.success && sizeCategoryDetails) {
        result.data = {
          sizeCategory: {
            code: sizeCategoryDetails.code,
            name: sizeCategoryDetails.name,
            description: sizeCategoryDetails.description,
            wingspanRange: sizeCategoryDetails.wingspanRange,
            lengthRange: sizeCategoryDetails.lengthRange
          },
          aircraftTypes: result.data
        };
      }
      
      return result;
    } catch (error) {
      return this.createErrorResponse(
        `Error finding aircraft types for size ${sizeCategory}: ${error.message}`,
        'SERVICE_ERROR',
        { sizeCategory }
      );
    }
  }
  
  /**
   * Format aircraft type data based on the requested format
   * 
   * @param {Object} aircraft - The aircraft type data
   * @param {string} format - The format to use ('simple', 'summary', 'detailed')
   * @returns {Object} - The formatted aircraft type data
   */
  formatReferenceData(aircraft, format = 'summary') {
    // Use data transformer if available
    if (this.dataTransformer && typeof this.dataTransformer.transformAircraftTypeData === 'function') {
      return this.dataTransformer.transformAircraftTypeData(aircraft, format);
    }
    
    // Otherwise, do basic formatting
    switch (format.toLowerCase()) {
      case 'simple':
        return {
          iata: aircraft.iata,
          name: aircraft.name,
          sizeCategory: aircraft.sizeCategory
        };
        
      case 'summary':
        return {
          id: aircraft.id,
          iata: aircraft.iata,
          icao: aircraft.icao,
          name: aircraft.name,
          manufacturer: aircraft.manufacturer,
          sizeCategory: aircraft.sizeCategory,
          bodyType: aircraft.bodyType
        };
        
      case 'detailed':
      default:
        return {
          id: aircraft.id,
          iata: aircraft.iata,
          icao: aircraft.icao,
          name: aircraft.name,
          manufacturer: aircraft.manufacturer,
          sizeCategory: aircraft.sizeCategory,
          bodyType: aircraft.bodyType,
          wingspanMeters: aircraft.wingspanMeters,
          lengthMeters: aircraft.lengthMeters,
          heightMeters: aircraft.heightMeters,
          mtow: aircraft.mtow, // Maximum Take-Off Weight
          range: aircraft.range,
          capacity: aircraft.capacity,
          engines: aircraft.engines,
          notes: aircraft.notes
        };
    }
  }
}

module.exports = AircraftTypeInfoQueryHandler;