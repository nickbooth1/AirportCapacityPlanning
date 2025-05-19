/**
 * Query Service Provider
 * 
 * This module provides services to query handlers, ensuring that all handlers
 * have access to the knowledge base and other required services.
 */

// Import knowledge base services
const {
  StandDataService,
  MaintenanceDataService,
  AirportConfigDataService,
  ReferenceDataService,
  CacheService,
  DataTransformerService
} = require('../../knowledge');

// Other services the handlers might need
const logger = require('../../../utils/logger');

/**
 * Create a service provider for query handlers
 * 
 * @param {Object} additionalServices - Any additional services to provide
 * @returns {Object} - A services object to pass to handlers
 */
function createQueryServiceProvider(additionalServices = {}) {
  // Basic services that all handlers need
  const services = {
    // Logger
    logger,
    
    // Knowledge base services combined
    knowledgeServices: {
      StandDataService,
      MaintenanceDataService,
      AirportConfigDataService,
      ReferenceDataService,
      CacheService,
      DataTransformerService
    },
    
    // Individual knowledge services for direct access
    standDataService: StandDataService,
    maintenanceDataService: MaintenanceDataService,
    airportConfigService: AirportConfigDataService,
    referenceDataService: ReferenceDataService,
    cacheService: CacheService,
    dataTransformer: DataTransformerService
  };
  
  // Add any additional services
  return {
    ...services,
    ...additionalServices
  };
}

module.exports = createQueryServiceProvider;