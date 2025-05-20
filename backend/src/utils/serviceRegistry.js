/**
 * Service Registry
 * 
 * This module registers all application services with the dependency injection container.
 * It serves as a centralized location to manage service registrations and their dependencies.
 */

const { ServiceLocator } = require('./di');
const logger = require('./logger');
const db = require('./db');

/**
 * Register all services with the DI container
 */
function registerServices() {
  // Register core utilities
  ServiceLocator.register('logger', logger);
  ServiceLocator.register('db', db);
  
  // Register configuration
  ServiceLocator.register('config', require('../config'));
  
  // Import services from their respective files
  // We need to use require here to avoid circular dependencies
  const standCapacityService = require('../services/standCapacityService');
  const capacityService = require('../services/capacityService');
  const maintenanceRequestService = require('../services/maintenanceRequestService');
  const maintenanceService = require('../services/maintenanceService');
  const flightDataService = require('../services/FlightDataService');
  const airportConfigService = require('../services/airportConfigService');
  const airportService = require('../services/AirportService');
  const flightUploadService = require('../services/FlightUploadService');
  const flightValidationService = require('../services/FlightValidationService');
  const airlineService = require('../services/AirlineService');
  const groundHandlingAgentService = require('../services/GroundHandlingAgentService');
  const columnMappingService = require('../services/ColumnMappingService');
  const flightProcessorService = require('../services/FlightProcessorService');
  
  // Register core services
  ServiceLocator.register('standCapacityService', standCapacityService);
  ServiceLocator.register('capacityService', capacityService);  // Register the new facade service
  ServiceLocator.register('maintenanceRequestService', maintenanceRequestService);
  ServiceLocator.register('maintenanceService', maintenanceService);  // Register the new facade service
  ServiceLocator.register('flightDataService', flightDataService);
  ServiceLocator.register('airportConfigService', airportConfigService);
  ServiceLocator.register('airportService', airportService);
  ServiceLocator.register('flightUploadService', flightUploadService);
  ServiceLocator.register('flightValidationService', flightValidationService);
  ServiceLocator.register('airlineService', airlineService);
  ServiceLocator.register('groundHandlingAgentService', groundHandlingAgentService);
  ServiceLocator.register('columnMappingService', columnMappingService);
  ServiceLocator.register('flightProcessorService', flightProcessorService);
  
  // Register agent services
  try {
    // These services might not be available in all environments
    const agentServices = [
      { name: 'openAIService', path: '../services/agent/OpenAIService' },
      { name: 'nlpService', path: '../services/agent/NLPService' },
      { name: 'contextService', path: '../services/agent/ContextService' },
      { name: 'vectorSearchService', path: '../services/agent/VectorSearchService' },
      { name: 'aggregatedCapacityImpactService', path: '../services/agent/AggregatedCapacityImpactService' },
      { name: 'autonomousOperationsService', path: '../services/agent/AutonomousOperationsService' },
      { name: 'voiceInterfaceService', path: '../services/agent/VoiceInterfaceService' },
      { name: 'workingMemoryService', path: '../services/agent/WorkingMemoryService' },
      { name: 'multiStepReasoningService', path: '../services/agent/MultiStepReasoningService' },
      { name: 'parameterValidationService', path: '../services/agent/ParameterValidationService' },
      { name: 'visualizationService', path: '../services/agent/VisualizationService' },
      { name: 'webSocketService', path: '../services/agent/WebSocketService' }
    ];
    
    agentServices.forEach(service => {
      try {
        const implementation = require(service.path);
        ServiceLocator.register(service.name, implementation);
        logger.debug(`Registered agent service: ${service.name}`);
      } catch (error) {
        logger.warn(`Failed to register agent service ${service.name}: ${error.message}`);
      }
    });
  } catch (error) {
    logger.warn(`Error registering agent services: ${error.message}`);
  }

  logger.info(`Service registry initialized with ${ServiceLocator.getRegisteredServiceNames().length} services`);
}

/**
 * Convert existing service singleton to use DI
 * This allows for gradual migration of services to the DI pattern
 * 
 * @param {Object} originalModule - The original module.exports object
 * @param {string} serviceName - Name to register with the DI container
 * @param {Function} ServiceClass - Service class constructor
 * @param {Array<string>} dependencies - Service dependencies to inject
 * @returns {Object} - The service instance
 */
function convertToInjectable(originalModule, serviceName, ServiceClass, dependencies = []) {
  // Check if already registered
  if (ServiceLocator.has(serviceName)) {
    return ServiceLocator.get(serviceName);
  }
  
  try {
    // Create a factory function that creates a new instance with injected dependencies
    const factory = (...deps) => {
      const instance = new ServiceClass(...deps);
      
      // Copy any existing properties from the original singleton
      if (originalModule && typeof originalModule === 'object') {
        // Only copy own properties that don't already exist
        Object.getOwnPropertyNames(originalModule).forEach(prop => {
          if (!instance.hasOwnProperty(prop) && prop !== 'constructor') {
            instance[prop] = originalModule[prop];
          }
        });
      }
      
      return instance;
    };
    
    // Register with the DI container
    ServiceLocator.register(serviceName, factory, { dependencies });
    
    // Return the new instance
    return ServiceLocator.get(serviceName);
  } catch (error) {
    logger.error(`Failed to convert service to injectable: ${serviceName}`, error);
    // Fallback to the original module
    return originalModule;
  }
}

module.exports = {
  registerServices,
  convertToInjectable
};