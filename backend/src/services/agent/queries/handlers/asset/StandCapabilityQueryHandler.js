/**
 * Stand Capability Query Handler
 * 
 * Handles queries related to stand capabilities, including:
 * - Which aircraft types a stand can accommodate
 * - Which stands can accommodate a specific aircraft type
 * - Special capabilities of stands (e.g., power, specialized equipment)
 */
const QueryHandlerBase = require('../../QueryHandlerBase');

class StandCapabilityQueryHandler extends QueryHandlerBase {
  /**
   * Get the types of queries this handler can process
   * 
   * @returns {Array<string>} - Array of query intents this handler can process
   */
  getQueryTypes() {
    return [
      'stand.capability',
      'stand.aircraft',
      'aircraft.stands',
      'stand.equipment'
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

    // For stand.capability and stand.equipment, we need a stand identifier
    if (parsedQuery.intent === 'stand.capability' || parsedQuery.intent === 'stand.equipment') {
      const standIdentifier = this.getEntityValue(
        entities,
        'stand',
        ['standId', 'standName', 'standNumber'],
        null
      );
      
      return standIdentifier !== null;
    }

    // For stand.aircraft, we need a stand identifier
    if (parsedQuery.intent === 'stand.aircraft') {
      const standIdentifier = this.getEntityValue(
        entities,
        'stand',
        ['standId', 'standName', 'standNumber'],
        null
      );
      
      return standIdentifier !== null;
    }

    // For aircraft.stands, we need an aircraft type
    if (parsedQuery.intent === 'aircraft.stands') {
      return (
        entities.aircraftType !== undefined ||
        entities.aircraftSize !== undefined ||
        entities.iata !== undefined ||
        entities.icao !== undefined
      );
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

      // For aircraft queries, we need the reference data service
      let referenceDataService = null;
      if (['aircraft.stands', 'stand.aircraft'].includes(parsedQuery.intent)) {
        referenceDataService = this.services.referenceDataService || 
          this.knowledgeServices.ReferenceDataService;
        
        if (!referenceDataService) {
          return this.createErrorResponse(
            'Reference data service not available for aircraft information',
            'SERVICE_UNAVAILABLE'
          );
        }
      }

      // Process the query based on intent
      let result;
      
      switch (parsedQuery.intent) {
        case 'stand.capability':
          result = await this.handleStandCapabilityQuery(parsedQuery, standDataService);
          break;
        
        case 'stand.aircraft':
          result = await this.handleStandAircraftQuery(parsedQuery, standDataService, referenceDataService);
          break;
        
        case 'aircraft.stands':
          result = await this.handleAircraftStandsQuery(parsedQuery, standDataService, referenceDataService);
          break;
        
        case 'stand.equipment':
          result = await this.handleStandEquipmentQuery(parsedQuery, standDataService);
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
        `Error processing stand capability query: ${error.message}`,
        'PROCESSING_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Handle stand.capability intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleStandCapabilityQuery(parsedQuery, standDataService) {
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

    // Get stand details
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

    // Get capabilities for the stand
    let capabilities;
    try {
      capabilities = await standDataService.getStandCapabilities(stand.id);
    } catch (error) {
      // If dedicated capabilities method fails, extract from stand info
      capabilities = {
        maxAircraftSize: stand.maxAircraftSize,
        restrictions: stand.restrictions || [],
        equipment: stand.equipment || [],
        features: stand.features || []
      };
    }

    // Format the capability data
    const capabilityData = {
      id: stand.id,
      name: stand.name,
      maxAircraftSize: capabilities.maxAircraftSize,
      supportedAircraftTypes: capabilities.supportedAircraftTypes || this.getSupportedAircraftTypes(capabilities.maxAircraftSize),
      restrictions: capabilities.restrictions || [],
      specialCapabilities: capabilities.equipment || [],
      features: capabilities.features || []
    };

    return this.createSuccessResponse(capabilityData, {
      standId: stand.id
    });
  }

  /**
   * Handle stand.aircraft intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @param {Object} referenceDataService - The reference data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleStandAircraftQuery(parsedQuery, standDataService, referenceDataService) {
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

    // Get stand details
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

    // Get compatible aircraft types
    let compatibleAircraft;
    try {
      // Check if we have a specific method for this
      if (typeof standDataService.getCompatibleAircraftTypes === 'function') {
        compatibleAircraft = await standDataService.getCompatibleAircraftTypes(stand.id);
      } else {
        // Fall back to getting aircraft types by size category
        compatibleAircraft = await referenceDataService.getAircraftTypes({ 
          sizeCodes: this.getCompatibleSizeCodes(stand.maxAircraftSize) 
        });
      }
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving compatible aircraft: ${error.message}`,
        'SERVICE_ERROR'
      );
    }

    if (!compatibleAircraft || compatibleAircraft.length === 0) {
      return this.createErrorResponse(
        `No compatible aircraft found for stand ${stand.name}`,
        'NO_RESULTS'
      );
    }

    // Format the response
    const format = this.getEntityValue(
      parsedQuery.entities,
      'format',
      ['responseFormat', 'detailLevel'],
      'summary'
    );

    const formattedResult = {
      standId: stand.id,
      standName: stand.name,
      maxAircraftSize: stand.maxAircraftSize,
      compatibleAircraft: compatibleAircraft.map(aircraft => {
        if (format === 'simple') {
          return {
            iata: aircraft.iata,
            name: aircraft.name
          };
        } else {
          return {
            iata: aircraft.iata,
            icao: aircraft.icao,
            name: aircraft.name,
            manufacturer: aircraft.manufacturer,
            sizeCategory: aircraft.sizeCategory,
            wingspanMeters: aircraft.wingspanMeters,
            lengthMeters: aircraft.lengthMeters
          };
        }
      })
    };

    return this.createSuccessResponse(formattedResult, {
      standId: stand.id,
      format,
      count: compatibleAircraft.length
    });
  }

  /**
   * Handle aircraft.stands intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @param {Object} referenceDataService - The reference data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleAircraftStandsQuery(parsedQuery, standDataService, referenceDataService) {
    const entities = parsedQuery.entities || {};
    
    // Extract aircraft identifiers
    let aircraftType = this.getEntityValue(
      entities,
      'aircraftType',
      ['iata', 'icao', 'aircraft'],
      null
    );

    let aircraftSize = this.getEntityValue(
      entities,
      'aircraftSize',
      ['size', 'sizeCategory', 'sizeCode'],
      null
    );

    if (!aircraftType && !aircraftSize) {
      return this.createErrorResponse(
        'Aircraft type or size category is required',
        'MISSING_ENTITY'
      );
    }

    // If aircraft type is provided but not size, we need to look up the size
    if (aircraftType && !aircraftSize) {
      try {
        // Look up the aircraft type to get its size category
        const aircraftTypes = await referenceDataService.getAircraftTypes({
          iata: aircraftType,
          icao: aircraftType
        });

        if (aircraftTypes && aircraftTypes.length > 0) {
          aircraftSize = aircraftTypes[0].sizeCategory;
        } else {
          return this.createErrorResponse(
            `Aircraft type ${aircraftType} not found`,
            'NOT_FOUND'
          );
        }
      } catch (error) {
        return this.createErrorResponse(
          `Error retrieving aircraft type: ${error.message}`,
          'SERVICE_ERROR'
        );
      }
    }

    // Now find stands that can accommodate this aircraft
    let compatibleStands;
    try {
      // Check if we have a specific method for this
      if (typeof standDataService.getStandsForAircraftType === 'function') {
        compatibleStands = await standDataService.getStandsForAircraftType(
          aircraftType,
          aircraftSize
        );
      } else {
        // Fall back to filtering stands by max aircraft size
        compatibleStands = await standDataService.getStands({
          minAircraftSize: aircraftSize
        });
      }
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving compatible stands: ${error.message}`,
        'SERVICE_ERROR'
      );
    }

    if (!compatibleStands || compatibleStands.length === 0) {
      return this.createErrorResponse(
        `No compatible stands found for aircraft ${aircraftType || 'size ' + aircraftSize}`,
        'NO_RESULTS'
      );
    }

    // Additional filtering (if needed)
    if (entities.terminal) {
      compatibleStands = compatibleStands.filter(stand => 
        stand.terminal === entities.terminal
      );
    }

    if (entities.pier) {
      compatibleStands = compatibleStands.filter(stand => 
        stand.pier === entities.pier
      );
    }

    if (entities.available !== undefined) {
      const requireAvailable = entities.available === true || 
                            entities.available === 'true' || 
                            entities.available === 'yes';
                            
      compatibleStands = compatibleStands.filter(stand => 
        stand.available === requireAvailable
      );
    }

    // Format the response
    const format = this.getEntityValue(
      entities,
      'format',
      ['responseFormat', 'detailLevel'],
      'summary'
    );

    const formattedResult = {
      aircraftType: aircraftType,
      aircraftSize: aircraftSize,
      compatibleStands: compatibleStands.map(stand => {
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
            maxAircraftSize: stand.maxAircraftSize,
            type: stand.type,
            available: !!stand.available
          };
        }
      })
    };

    // Group by terminal for easier viewing
    if (format !== 'simple' && !entities.terminal) {
      const standsByTerminal = {};
      
      formattedResult.compatibleStands.forEach(stand => {
        if (!standsByTerminal[stand.terminal]) {
          standsByTerminal[stand.terminal] = [];
        }
        
        standsByTerminal[stand.terminal].push(stand);
      });
      
      formattedResult.standsByTerminal = standsByTerminal;
    }

    return this.createSuccessResponse(formattedResult, {
      aircraftType,
      aircraftSize,
      format,
      count: compatibleStands.length
    });
  }

  /**
   * Handle stand.equipment intent
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} standDataService - The stand data service
   * @returns {Promise<Object>} - The formatted response
   */
  async handleStandEquipmentQuery(parsedQuery, standDataService) {
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

    // Get stand details
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

    // Get equipment for the stand
    let equipment;
    try {
      if (typeof standDataService.getStandEquipment === 'function') {
        equipment = await standDataService.getStandEquipment(stand.id);
      } else {
        equipment = stand.equipment || [];
      }
    } catch (error) {
      return this.createErrorResponse(
        `Error retrieving stand equipment: ${error.message}`,
        'SERVICE_ERROR'
      );
    }

    // Ensure equipment is an array
    if (!Array.isArray(equipment)) {
      equipment = [];
    }

    // Format the equipment data
    const equipmentData = {
      id: stand.id,
      name: stand.name,
      equipment: equipment,
      hasFixedBridges: equipment.some(e => e.type === 'FIXED_BRIDGE'),
      hasPowerSupply: equipment.some(e => e.type === 'POWER_SUPPLY'),
      hasFuelAccess: equipment.some(e => e.type === 'FUEL_ACCESS'),
      specialEquipment: equipment.filter(e => e.type === 'SPECIAL').map(e => e.name)
    };

    return this.createSuccessResponse(equipmentData, {
      standId: stand.id
    });
  }

  /**
   * Get supported aircraft types based on size code
   * 
   * @param {string} sizeCode - The size code (A-F)
   * @returns {Array<string>} - Array of supported aircraft type codes
   */
  getSupportedAircraftTypes(sizeCode) {
    // This is a simple mapping of size categories to common aircraft types
    // In a real system, this would come from a database or config
    const typesBySize = {
      'A': ['DH8', 'AT4', 'E70'],
      'B': ['E90', 'E95', 'CRJ', 'E70', 'DH8', 'AT4'],
      'C': ['320', '321', '737', '738', 'E90', 'E95', 'CRJ', 'E70', 'DH8', 'AT4'],
      'D': ['757', '767', '320', '321', '737', '738'],
      'E': ['777', '787', '330', '340', '350', '757', '767'],
      'F': ['388', '748', '777', '787', '330', '340', '350']
    };
    
    return (typesBySize[sizeCode] || []).sort();
  }

  /**
   * Get compatible size codes based on maximum size
   * 
   * @param {string} maxSizeCode - The maximum size code (A-F)
   * @returns {Array<string>} - Array of compatible size codes
   */
  getCompatibleSizeCodes(maxSizeCode) {
    const sizeOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
    const maxIndex = sizeOrder.indexOf(maxSizeCode);
    
    if (maxIndex === -1) {
      return [];
    }
    
    return sizeOrder.slice(0, maxIndex + 1);
  }
}

module.exports = StandCapabilityQueryHandler;