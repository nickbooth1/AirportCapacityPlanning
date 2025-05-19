/**
 * Stand Detail Query Handler
 * 
 * Handles queries related to stand details, including:
 * - Details about a specific stand
 * - Stand information lookup
 * - Stand status and availability
 */
const QueryHandlerBase = require('../../QueryHandlerBase');

class StandDetailQueryHandler extends QueryHandlerBase {
  /**
   * Get the types of queries this handler can process
   * 
   * @returns {Array<string>} - Array of query intents this handler can process
   */
  getQueryTypes() {
    return [
      'stand.details',
      'stand.info',
      'stand.status',
      'stand.find'
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
    // Check for basic intent match using parent method
    if (!super.canHandle(parsedQuery, context)) {
      return false;
    }

    // Require stand identifier for detail queries unless it's a 'find' query
    if (parsedQuery.intent === 'stand.details' || parsedQuery.intent === 'stand.status') {
      const standIdentifier = this.getEntityValue(
        parsedQuery.entities,
        'stand',
        ['standId', 'standName', 'standNumber'],
        null
      );
      
      return standIdentifier !== null;
    }

    // For find queries, we need some criteria
    if (parsedQuery.intent === 'stand.find') {
      const entities = parsedQuery.entities || {};
      const hasCriteria = Object.keys(entities).some(key => 
        ['terminal', 'pier', 'status', 'type', 'available', 'size'].includes(key)
      );
      
      return hasCriteria;
    }

    // For general info queries, no specific requirements
    return true;
  }

  /**
   * Handle the query and generate a response
   * 
   * @param {Object} parsedQuery - The parsed query object
   * @param {Object} context - The conversation context
   * @returns {Promise<Object>} - The query response
   */
  async handleQuery(parsedQuery, context = {}) {
    try {
      // Check cache first
      const cachedResponse = this.getCachedResponse(parsedQuery, context);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Get the stand data service
      const standDataService = this.services.standDataService || 
        this.knowledgeServices.StandDataService;
      
      if (!standDataService) {
        return this.createErrorResponse(
          'Stand data service not available',
          'SERVICE_UNAVAILABLE'
        );
      }

      // Process the query based on intent
      let result;
      
      switch (parsedQuery.intent) {
        case 'stand.details':
          result = await this.handleStandDetails(parsedQuery, standDataService);
          break;
        
        case 'stand.status':
          result = await this.handleStandStatus(parsedQuery, standDataService);
          break;
        
        case 'stand.find':
          result = await this.handleStandFind(parsedQuery, standDataService);
          break;
        
        case 'stand.info':
        default:
          result = await this.handleStandInfo(parsedQuery, standDataService);
          break;
      }

      // Cache the result
      this.cacheResponse(parsedQuery, context, result);
      
      return result;
    } catch (error) {
      return this.createErrorResponse(
        `Error processing stand query: ${error.message}`,
        'PROCESSING_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Handle stand.details intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleStandDetails(parsedQuery, standDataService) {
    // Extract the stand identifier
    const standIdentifier = this.getEntityValue(
      parsedQuery.entities, 
      'stand', 
      ['standId', 'standName', 'standNumber'],
      null
    );

    if (!standIdentifier) {
      return this.createErrorResponse(
        'Stand identifier is required',
        'MISSING_ENTITY'
      );
    }

    // Determine if it's a numeric ID or a name
    let stand;
    if (!isNaN(standIdentifier) && Number.isInteger(Number(standIdentifier))) {
      // It's an ID
      stand = await standDataService.getStandById(Number(standIdentifier));
    } else {
      // It's a name
      const stands = await standDataService.getStands({ name: standIdentifier });
      stand = stands && stands.length > 0 ? stands[0] : null;
    }

    if (!stand) {
      return this.createErrorResponse(
        `Stand ${standIdentifier} not found`,
        'NOT_FOUND'
      );
    }

    // Get the format parameter if available
    const format = this.getEntityValue(
      parsedQuery.entities,
      'format',
      ['responseFormat', 'detailLevel'],
      'detailed'
    );

    // Format the stand data
    const formattedData = this.formatStandData(stand, format);

    return this.createSuccessResponse(formattedData, {
      standId: stand.id,
      format
    });
  }

  /**
   * Handle stand.status intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleStandStatus(parsedQuery, standDataService) {
    // Extract the stand identifier
    const standIdentifier = this.getEntityValue(
      parsedQuery.entities, 
      'stand', 
      ['standId', 'standName', 'standNumber'],
      null
    );

    if (!standIdentifier) {
      return this.createErrorResponse(
        'Stand identifier is required',
        'MISSING_ENTITY'
      );
    }

    // Get stand with maintenance status
    let standWithStatus;
    try {
      if (!isNaN(standIdentifier) && Number.isInteger(Number(standIdentifier))) {
        // It's an ID
        const stands = await standDataService.getStandsWithMaintenanceStatus({
          standId: Number(standIdentifier)
        });
        standWithStatus = stands && stands.length > 0 ? stands[0] : null;
      } else {
        // It's a name
        const stands = await standDataService.getStandsWithMaintenanceStatus({
          name: standIdentifier
        });
        standWithStatus = stands && stands.length > 0 ? stands[0] : null;
      }
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving stand status: ${error.message}`,
        'SERVICE_ERROR'
      );
    }

    if (!standWithStatus) {
      return this.createErrorResponse(
        `Stand ${standIdentifier} not found`,
        'NOT_FOUND'
      );
    }

    // Format the status data
    const statusData = {
      id: standWithStatus.id,
      name: standWithStatus.name,
      status: standWithStatus.maintenanceStatus || 'OPERATIONAL',
      available: !!standWithStatus.available,
      maintenanceDetails: standWithStatus.maintenanceDetails || null,
      lastUpdated: new Date().toISOString()
    };

    return this.createSuccessResponse(statusData, {
      standId: standWithStatus.id
    });
  }

  /**
   * Handle stand.find intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleStandFind(parsedQuery, standDataService) {
    // Extract the search criteria from entities
    const entities = parsedQuery.entities || {};
    const criteria = {};

    // Map entity values to search criteria
    if (entities.terminal) criteria.terminal = entities.terminal;
    if (entities.pier) criteria.pier = entities.pier;
    if (entities.type) criteria.type = entities.type;
    if (entities.size || entities.aircraftSize) {
      criteria.maxAircraftSize = entities.size || entities.aircraftSize;
    }
    
    // Handle availability specifically
    if (entities.available !== undefined) {
      if (typeof entities.available === 'boolean') {
        criteria.available = entities.available;
      } else if (typeof entities.available === 'string') {
        criteria.available = entities.available.toLowerCase() === 'true' || 
                          entities.available.toLowerCase() === 'yes' ||
                          entities.available.toLowerCase() === 'available';
      }
    }

    // Get the limit parameter if available
    const limit = this.getEntityValue(
      parsedQuery.entities,
      'limit',
      ['maxResults', 'count'],
      10
    );

    // Execute the search
    let stands;
    try {
      if (criteria.available !== undefined) {
        stands = await standDataService.getStandsWithAvailability(criteria, limit);
      } else {
        stands = await standDataService.getStands(criteria, limit);
      }
    } catch (error) {
      return this.createErrorResponse(
        `Error finding stands: ${error.message}`,
        'SERVICE_ERROR'
      );
    }

    if (!stands || stands.length === 0) {
      return this.createErrorResponse(
        'No stands found matching your criteria',
        'NO_RESULTS',
        { criteria }
      );
    }

    // Format the results
    const format = this.getEntityValue(
      parsedQuery.entities,
      'format',
      ['responseFormat', 'detailLevel'],
      'summary'
    );

    const formattedResults = stands.map(stand => this.formatStandData(stand, format));

    return this.createSuccessResponse(formattedResults, {
      count: formattedResults.length,
      criteria,
      format
    });
  }

  /**
   * Handle stand.info intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleStandInfo(parsedQuery, standDataService) {
    // This handles general information requests about stands
    
    // Get the count of stands
    let standCount = 0;
    try {
      const counts = await standDataService.getStandStatistics();
      standCount = counts.total || 0;
    } catch (error) {
      // If statistics fail, try counting stands directly
      try {
        const stands = await standDataService.getStands();
        standCount = stands ? stands.length : 0;
      } catch (innerError) {
        return this.createErrorResponse(
          `Error retrieving stand information: ${innerError.message}`,
          'SERVICE_ERROR'
        );
      }
    }

    // Get the distribution of stand types
    let standTypes = {};
    try {
      standTypes = await standDataService.getStandTypeDistribution();
    } catch (error) {
      standTypes = { CONTACT: 0, REMOTE: 0 };
    }

    // Format the general information
    const infoData = {
      totalStands: standCount,
      standTypes,
      lastUpdated: new Date().toISOString()
    };

    return this.createSuccessResponse(infoData);
  }

  /**
   * Format stand data based on the requested format
   * 
   * @param {Object} stand - The stand data
   * @param {string} format - The format to use ('simple', 'summary', 'detailed')
   * @returns {Object} - The formatted stand data
   */
  formatStandData(stand, format = 'detailed') {
    // Use data transformer if available
    if (this.dataTransformer && typeof this.dataTransformer.transformStandData === 'function') {
      return this.dataTransformer.transformStandData(stand, format);
    }
    
    // Otherwise, do basic formatting
    switch (format.toLowerCase()) {
      case 'simple':
        return {
          id: stand.id,
          name: stand.name,
          terminal: stand.terminal,
          available: !!stand.available
        };
        
      case 'summary':
        return {
          id: stand.id,
          name: stand.name,
          terminal: stand.terminal,
          pier: stand.pier,
          type: stand.type,
          maxAircraftSize: stand.maxAircraftSize,
          available: !!stand.available,
          status: stand.maintenanceStatus || 'OPERATIONAL'
        };
        
      case 'detailed':
      default:
        return {
          id: stand.id,
          name: stand.name,
          terminal: stand.terminal,
          pier: stand.pier,
          type: stand.type,
          maxAircraftSize: stand.maxAircraftSize,
          available: !!stand.available,
          status: stand.maintenanceStatus || 'OPERATIONAL',
          restrictions: stand.restrictions || [],
          coordinates: stand.coordinates,
          maintenanceDetails: stand.maintenanceDetails || null,
          lastUpdated: stand.lastUpdated || new Date().toISOString()
        };
    }
  }
}

module.exports = StandDetailQueryHandler;