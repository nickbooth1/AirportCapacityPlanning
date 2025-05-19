/**
 * Query Handling Framework
 * 
 * This module exports the query handling components used by the agent
 * to process and respond to user queries.
 */

const QueryHandlerBase = require('./QueryHandlerBase');
const QueryRegistry = require('./QueryRegistry');
const createQueryServiceProvider = require('./QueryServiceProvider');

// Import handler categories
const assetHandlers = require('./handlers/asset');
const referenceHandlers = require('./handlers/reference');

// Export the main components
module.exports = {
  QueryHandlerBase,
  QueryRegistry,
  createQueryServiceProvider,
  
  // Export handler categories
  handlers: {
    asset: assetHandlers,
    reference: referenceHandlers
    // More handler categories will be added as they are implemented
  }
};

// Function to create a new query registry with all handlers registered
module.exports.createQueryRegistry = async (additionalServices = {}) => {
  // Create the service provider
  const services = createQueryServiceProvider(additionalServices);
  
  // Create the registry
  const registry = new QueryRegistry(services, {
    enableQueryCache: true
  });
  
  // Import and register all query handlers
  
  // Register Asset Information Query Handlers
  assetHandlers.handlers.forEach(HandlerClass => {
    registry.registerHandler(HandlerClass);
  });
  
  // Register Reference Data Query Handlers
  referenceHandlers.handlers.forEach(HandlerClass => {
    registry.registerHandler(HandlerClass);
  });
  
  // Maintenance Query Handlers
  // const MaintenanceStatusQueryHandler = require('./handlers/maintenance/MaintenanceStatusQueryHandler');
  // registry.registerHandler(MaintenanceStatusQueryHandler);
  
  // Operational Query Handlers
  // const CapacityStatisticsQueryHandler = require('./handlers/operational/CapacityStatisticsQueryHandler');
  // registry.registerHandler(CapacityStatisticsQueryHandler);
  
  return registry;
};