/**
 * Stand Location Query Handler
 * 
 * Handles queries related to stand locations, including:
 * - Where a specific stand is located
 * - Which stands are in a specific terminal or pier
 * - Finding the nearest stands to a location
 */
const QueryHandlerBase = require('../../QueryHandlerBase');

class StandLocationQueryHandler extends QueryHandlerBase {
  /**
   * Get the types of queries this handler can process
   * 
   * @returns {Array<string>} - Array of query intents this handler can process
   */
  getQueryTypes() {
    return [
      'stand.location',
      'stand.nearest',
      'terminal.stands',
      'pier.stands'
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

    const entities = parsedQuery.entities || {};

    // For stand.location, we need a stand identifier
    if (parsedQuery.intent === 'stand.location') {
      const standIdentifier = this.getEntityValue(
        entities,
        'stand',
        ['standId', 'standName', 'standNumber'],
        null
      );
      
      return standIdentifier !== null;
    }

    // For stand.nearest, we need coordinates or a location reference
    if (parsedQuery.intent === 'stand.nearest') {
      return (
        (entities.latitude !== undefined && entities.longitude !== undefined) ||
        entities.location !== undefined ||
        entities.referencePoint !== undefined
      );
    }

    // For terminal.stands, we need a terminal
    if (parsedQuery.intent === 'terminal.stands') {
      return entities.terminal !== undefined;
    }

    // For pier.stands, we need a pier
    if (parsedQuery.intent === 'pier.stands') {
      return entities.pier !== undefined;
    }

    return false;
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
        case 'stand.location':
          result = await this.handleStandLocationQuery(parsedQuery, standDataService);
          break;
        
        case 'stand.nearest':
          result = await this.handleNearestStandsQuery(parsedQuery, standDataService);
          break;
        
        case 'terminal.stands':
          result = await this.handleTerminalStandsQuery(parsedQuery, standDataService);
          break;
        
        case 'pier.stands':
          result = await this.handlePierStandsQuery(parsedQuery, standDataService);
          break;
        
        default:
          return this.createErrorResponse(
            `Unhandled query intent: ${parsedQuery.intent}`,
            'UNSUPPORTED_INTENT'
          );
      }

      // Cache the result
      this.cacheResponse(parsedQuery, context, result);
      
      return result;
    } catch (error) {
      return this.createErrorResponse(
        `Error processing stand location query: ${error.message}`,
        'PROCESSING_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Handle stand.location intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleStandLocationQuery(parsedQuery, standDataService) {
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

    // Find the stand
    let stand;
    try {
      if (!isNaN(standIdentifier) && Number.isInteger(Number(standIdentifier))) {
        // It's an ID
        stand = await standDataService.getStandById(Number(standIdentifier));
      } else {
        // It's a name
        const stands = await standDataService.getStands({ name: standIdentifier });
        stand = stands && stands.length > 0 ? stands[0] : null;
      }
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving stand: ${error.message}`,
        'SERVICE_ERROR'
      );
    }

    if (!stand) {
      return this.createErrorResponse(
        `Stand ${standIdentifier} not found`,
        'NOT_FOUND'
      );
    }

    // Format the location data
    const locationData = {
      id: stand.id,
      name: stand.name,
      terminal: stand.terminal,
      pier: stand.pier,
      coordinates: stand.coordinates || { lat: null, lng: null },
      locationDescription: `Stand ${stand.name} is located at ${stand.terminal}${stand.pier ? ', Pier ' + stand.pier : ''}`
    };

    return this.createSuccessResponse(locationData, {
      standId: stand.id
    });
  }

  /**
   * Handle stand.nearest intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleNearestStandsQuery(parsedQuery, standDataService) {
    const entities = parsedQuery.entities || {};
    
    // Extract the reference point
    let referencePoint;
    
    if (entities.latitude !== undefined && entities.longitude !== undefined) {
      // Use explicit coordinates
      referencePoint = {
        lat: parseFloat(entities.latitude),
        lng: parseFloat(entities.longitude)
      };
    } else if (entities.referencePoint) {
      // Use a named reference point
      // This would typically be resolved through a lookup service
      // For now, we'll use a simple mapping
      const refPointName = entities.referencePoint;
      
      // This is a placeholder implementation; in a real system,
      // you would use a map or database of reference points
      const refPoints = {
        't1': { lat: 51.5, lng: -0.1 },
        't2': { lat: 51.51, lng: -0.11 },
        'main': { lat: 51.52, lng: -0.12 }
      };
      
      referencePoint = refPoints[refPointName.toLowerCase()];
      
      if (!referencePoint) {
        return this.createErrorResponse(
          `Unknown reference point: ${refPointName}`,
          'INVALID_REFERENCE_POINT'
        );
      }
    } else if (entities.location) {
      // Use a location name (requires geocoding or location lookup)
      // This is a placeholder as well
      return this.createErrorResponse(
        'Location-based queries are not yet supported',
        'UNSUPPORTED_FEATURE'
      );
    } else {
      return this.createErrorResponse(
        'Reference point or coordinates required',
        'MISSING_ENTITY'
      );
    }

    // Get limit from query
    const limit = this.getEntityValue(
      parsedQuery.entities,
      'limit',
      ['count', 'maxResults'],
      5
    );

    // Filter options
    const filterOptions = {};
    
    if (entities.available !== undefined) {
      filterOptions.available = entities.available === true || 
                             entities.available === 'true' || 
                             entities.available === 'yes';
    }
    
    if (entities.type) {
      filterOptions.type = entities.type;
    }

    // Find nearest stands
    let nearestStands;
    try {
      nearestStands = await standDataService.getNearestStands(
        referencePoint,
        limit,
        filterOptions
      );
    } catch (error) {
      return this.createErrorResponse(
        `Error finding nearest stands: ${error.message}`,
        'SERVICE_ERROR'
      );
    }

    if (!nearestStands || nearestStands.length === 0) {
      return this.createErrorResponse(
        'No stands found near the specified location',
        'NO_RESULTS'
      );
    }

    // Format the results
    const format = this.getEntityValue(
      parsedQuery.entities,
      'format',
      ['responseFormat', 'detailLevel'],
      'summary'
    );

    const formattedResults = nearestStands.map(stand => {
      // Basic formatting - would use transformer in real implementation
      const standData = {
        id: stand.id,
        name: stand.name,
        terminal: stand.terminal,
        pier: stand.pier,
        coordinates: stand.coordinates,
        distance: stand.distance // This would be calculated by the service
      };
      
      if (format === 'detailed') {
        standData.type = stand.type;
        standData.maxAircraftSize = stand.maxAircraftSize;
        standData.available = !!stand.available;
      }
      
      return standData;
    });

    return this.createSuccessResponse(formattedResults, {
      count: formattedResults.length,
      referencePoint,
      format
    });
  }

  /**
   * Handle terminal.stands intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleTerminalStandsQuery(parsedQuery, standDataService) {
    const terminal = this.getEntityValue(
      parsedQuery.entities,
      'terminal',
      ['terminalId', 'terminalName'],
      null
    );

    if (!terminal) {
      return this.createErrorResponse(
        'Terminal identifier is required',
        'MISSING_ENTITY'
      );
    }

    // Additional filters
    const filters = { terminal };
    
    if (parsedQuery.entities.available !== undefined) {
      filters.available = parsedQuery.entities.available;
    }
    
    if (parsedQuery.entities.type) {
      filters.type = parsedQuery.entities.type;
    }

    // Get stands in terminal
    let stands;
    try {
      stands = await standDataService.getStands(filters);
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving terminal stands: ${error.message}`,
        'SERVICE_ERROR'
      );
    }

    if (!stands || stands.length === 0) {
      return this.createErrorResponse(
        `No stands found in terminal ${terminal}`,
        'NO_RESULTS'
      );
    }

    // Format the results
    const format = this.getEntityValue(
      parsedQuery.entities,
      'format',
      ['responseFormat', 'detailLevel'],
      'summary'
    );

    const formattedResults = stands.map(stand => {
      // Would use transformer in real implementation
      if (format === 'simple') {
        return {
          id: stand.id,
          name: stand.name,
          pier: stand.pier
        };
      } else {
        return {
          id: stand.id,
          name: stand.name,
          terminal: stand.terminal,
          pier: stand.pier,
          type: stand.type,
          available: !!stand.available,
          maxAircraftSize: stand.maxAircraftSize
        };
      }
    });

    return this.createSuccessResponse(formattedResults, {
      count: formattedResults.length,
      terminal,
      format
    });
  }

  /**
   * Handle pier.stands intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handlePierStandsQuery(parsedQuery, standDataService) {
    const pier = this.getEntityValue(
      parsedQuery.entities,
      'pier',
      ['pierId', 'pierName'],
      null
    );

    if (!pier) {
      return this.createErrorResponse(
        'Pier identifier is required',
        'MISSING_ENTITY'
      );
    }

    // Terminal filter is optional but helpful
    const terminal = this.getEntityValue(
      parsedQuery.entities,
      'terminal',
      ['terminalId', 'terminalName'],
      null
    );

    // Combined filters
    const filters = { pier };
    
    if (terminal) {
      filters.terminal = terminal;
    }
    
    if (parsedQuery.entities.available !== undefined) {
      filters.available = parsedQuery.entities.available;
    }

    // Get stands in pier
    let stands;
    try {
      stands = await standDataService.getStands(filters);
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving pier stands: ${error.message}`,
        'SERVICE_ERROR'
      );
    }

    if (!stands || stands.length === 0) {
      return this.createErrorResponse(
        `No stands found in pier ${pier}${terminal ? ' of terminal ' + terminal : ''}`,
        'NO_RESULTS'
      );
    }

    // Format the results
    const format = this.getEntityValue(
      parsedQuery.entities,
      'format',
      ['responseFormat', 'detailLevel'],
      'summary'
    );

    const formattedResults = stands.map(stand => {
      // Would use transformer in real implementation
      if (format === 'simple') {
        return {
          id: stand.id,
          name: stand.name,
          terminal: stand.terminal
        };
      } else {
        return {
          id: stand.id,
          name: stand.name,
          terminal: stand.terminal,
          pier: stand.pier,
          type: stand.type,
          available: !!stand.available,
          maxAircraftSize: stand.maxAircraftSize
        };
      }
    });

    // Group by terminal for better organization if multiple terminals
    let responseData = formattedResults;
    if (!terminal && format !== 'simple') {
      const groupedByTerminal = {};
      
      formattedResults.forEach(stand => {
        if (!groupedByTerminal[stand.terminal]) {
          groupedByTerminal[stand.terminal] = [];
        }
        groupedByTerminal[stand.terminal].push(stand);
      });
      
      responseData = { groupedByTerminal, allStands: formattedResults };
    }

    return this.createSuccessResponse(responseData, {
      count: formattedResults.length,
      pier,
      terminal,
      format
    });
  }
}

module.exports = StandLocationQueryHandler;