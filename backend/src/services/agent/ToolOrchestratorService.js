const logger = require('../../utils/logger');
const nlpService = require('./NLPService');
const standCapacityService = require('../standCapacityService');
const maintenanceRequestService = require('../maintenanceRequestService');
const airportConfigService = require('../airportConfigService');

/**
 * Service for orchestrating tools and API calls based on user intents
 */
class ToolOrchestratorService {
  constructor() {
    // Register available services
    this.services = {
      capacityService: standCapacityService,
      maintenanceService: maintenanceRequestService,
      infrastructureService: airportConfigService
    };
  }

  /**
   * Select and execute the appropriate tool based on intent and entities
   * @param {string} intent - The identified intent
   * @param {Object} entities - The extracted entities
   * @returns {Promise<Object>} - The result from the tool execution
   */
  async executeTool(intent, entities) {
    try {
      logger.info(`Executing tool for intent: ${intent}`);
      
      // Map intent to appropriate service and method
      const actionInfo = nlpService.mapIntentToAction(intent);
      
      if (!actionInfo.service || !actionInfo.method) {
        logger.warn(`No tool mapping found for intent: ${intent}`);
        return {
          success: false,
          error: 'No appropriate tool found for this query',
          requiresApproval: false
        };
      }
      
      // Get the service
      const service = this.services[actionInfo.service];
      
      if (!service) {
        logger.error(`Service not found: ${actionInfo.service}`);
        return {
          success: false,
          error: `Service ${actionInfo.service} not found`,
          requiresApproval: false
        };
      }
      
      // Check if the method exists
      if (typeof service[actionInfo.method] !== 'function') {
        logger.error(`Method not found: ${actionInfo.method} in service ${actionInfo.service}`);
        return {
          success: false,
          error: `Method ${actionInfo.method} not found in service ${actionInfo.service}`,
          requiresApproval: false
        };
      }
      
      // If this action requires approval, prepare the proposal instead of executing directly
      if (actionInfo.requiresApproval) {
        logger.info(`Action requires approval: ${actionInfo.service}.${actionInfo.method}`);
        
        return {
          success: true,
          requiresApproval: true,
          actionType: intent,
          service: actionInfo.service,
          method: actionInfo.method,
          parameters: this.mapEntitiesToParameters(intent, entities),
          description: this.generateActionDescription(intent, entities)
        };
      }
      
      // Execute the method with mapped parameters
      const parameters = this.mapEntitiesToParameters(intent, entities);
      logger.debug(`Executing ${actionInfo.service}.${actionInfo.method} with parameters: ${JSON.stringify(parameters)}`);
      
      // For Phase 1, we'll implement basic parameter mapping
      const result = await this.executeServiceMethod(service, actionInfo.method, parameters);
      
      return {
        success: true,
        requiresApproval: false,
        data: result
      };
    } catch (error) {
      logger.error(`Tool execution error: ${error.message}`);
      return {
        success: false,
        error: `Tool execution failed: ${error.message}`,
        requiresApproval: false
      };
    }
  }

  /**
   * Execute a service method with parameters
   * @param {Object} service - The service object
   * @param {string} method - The method name
   * @param {Object} parameters - The parameters for the method
   * @returns {Promise<any>} - The result of the method execution
   */
  async executeServiceMethod(service, method, parameters) {
    // For Phase 1, we'll implement a simple parameter passing mechanism
    // In future phases, this would be enhanced with more sophisticated parameter mapping
    
    try {
      // Convert parameters object to array of arguments if needed
      if (method === 'getCapacity') {
        const { terminal, aircraft_type, time_period } = parameters;
        return await service[method](terminal, aircraft_type, time_period);
      } 
      else if (method === 'getMaintenanceStatus') {
        const { stand, terminal, time_period } = parameters;
        return await service[method](stand, terminal, time_period);
      }
      else if (method === 'getInfrastructureInfo') {
        const { terminal, stand } = parameters;
        return await service[method](terminal, stand);
      }
      else {
        // For other methods, pass the entire parameters object
        return await service[method](parameters);
      }
    } catch (error) {
      logger.error(`Service method execution error: ${error.message}`);
      throw new Error(`Failed to execute service method: ${error.message}`);
    }
  }

  /**
   * Map extracted entities to service method parameters
   * @param {string} intent - The identified intent
   * @param {Object} entities - The extracted entities
   * @returns {Object} - The mapped parameters
   */
  mapEntitiesToParameters(intent, entities) {
    // Basic mapping for Phase 1
    // In future phases, this would be enhanced with more sophisticated mapping
    
    // Process time expressions
    if (entities.time_period) {
      const timeInfo = nlpService.processTimeExpression(entities.time_period);
      if (timeInfo && timeInfo.type !== 'error' && timeInfo.type !== 'unknown') {
        entities.processed_time = timeInfo;
      }
    }
    
    return entities;
  }

  /**
   * Generate a human-readable description of an action
   * @param {string} intent - The identified intent
   * @param {Object} entities - The extracted entities
   * @returns {string} - The action description
   */
  generateActionDescription(intent, entities) {
    switch (intent) {
      case nlpService.intents.MAINTENANCE_CREATE:
        return `Create maintenance request for stand ${entities.stand || 'unknown'} ${
          entities.time_period ? `during ${entities.time_period}` : ''
        }`;
        
      case nlpService.intents.MAINTENANCE_UPDATE:
        return `Update maintenance request for stand ${entities.stand || 'unknown'} ${
          entities.time_period ? `during ${entities.time_period}` : ''
        }`;
        
      case nlpService.intents.CAPACITY_PARAMETER_UPDATE:
        return `Update capacity parameters ${
          entities.parameter ? `for ${entities.parameter}` : ''
        }`;
        
      default:
        return `Execute ${intent} action`;
    }
  }

  /**
   * Execute an approved action
   * @param {string} service - The service name
   * @param {string} method - The method name
   * @param {Object} parameters - The method parameters
   * @returns {Promise<Object>} - The result of the action
   */
  async executeApprovedAction(service, method, parameters) {
    try {
      logger.info(`Executing approved action: ${service}.${method}`);
      
      const serviceObject = this.services[service];
      
      if (!serviceObject) {
        throw new Error(`Service not found: ${service}`);
      }
      
      if (typeof serviceObject[method] !== 'function') {
        throw new Error(`Method not found: ${method} in service ${service}`);
      }
      
      const result = await this.executeServiceMethod(serviceObject, method, parameters);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error(`Approved action execution error: ${error.message}`);
      return {
        success: false,
        error: `Action execution failed: ${error.message}`
      };
    }
  }
}

module.exports = new ToolOrchestratorService(); 