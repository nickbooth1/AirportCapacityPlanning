const logger = require('../../utils/logger');
const nlpService = require('./StubNLPService');  // Use the stub NLP service
const standCapacityService = require('../standCapacityService');
const capacityService = require('../capacityService');
const maintenanceRequestService = require('../maintenanceRequestService');
const maintenanceService = require('../maintenanceService');
const airportConfigService = require('../airportConfigService');
const airlineService = require('../AirlineService');
const airportService = require('../AirportService');
const flightDataService = require('../FlightDataService');
const standCapacityToolService = require('../standCapacityToolService');
const { ServiceLocator } = require('../../utils/di');

/**
 * Service for orchestrating tools and API calls based on user intents
 */
class ToolOrchestratorService {
  constructor() {
    // Register available services
    this.services = {
      capacityService: capacityService,  // Use our new facade service
      maintenanceService: maintenanceService,  // Use our new facade service
      standCapacityService: standCapacityService,  // Keep the original service for backward compatibility
      maintenanceRequestService: maintenanceRequestService,  // Keep the original service for backward compatibility
      infrastructureService: airportConfigService,
      airlineService: airlineService,
      airportService: airportService,
      flightDataService: flightDataService,
      standService: standCapacityToolService,
      helpService: this
    };
    
    // Define mappings between intents and their subtypes
    this.intentSubtypes = {
      [nlpService.intents.CAPACITY_QUERY]: [
        {
          subtype: 'overall_capacity',
          patterns: [
            /overall/, /total/, /airport-wide/, /all stands/, /entire airport/
          ],
          service: 'capacityService',
          method: 'calculateCapacity'
        },
        {
          subtype: 'terminal_capacity',
          patterns: [
            /terminal/, /^T\d/, /terminal \d/
          ],
          service: 'capacityService',
          method: 'calculateStandCapacity'
        },
        {
          subtype: 'stand_capacity',
          patterns: [
            /stand \w+/, /gate \w+/, /stand capacity/, /\w+\d+\w*/
          ],
          service: 'capacityService',
          method: 'calculateStandCapacity'
        },
        {
          subtype: 'aircraft_type_capacity',
          patterns: [
            /aircraft type/, /airplane type/, /plane type/, /A\d{3}/, /B\d{3}/,
            /capacity for \w+/, /handle \w+/
          ],
          service: 'capacityService',
          method: 'calculateCapacity'
        },
        {
          subtype: 'period_capacity',
          patterns: [
            /time/, /period/, /during/, /hourly/, /daily/, /weekly/, /monthly/,
            /peak/, /busy/, /off-peak/
          ],
          service: 'capacityService',
          method: 'calculateCapacityForTimeSlot'
        },
        {
          // Default subtype
          subtype: 'general_capacity',
          patterns: [],
          service: 'capacityService',
          method: 'calculateCapacity'
        }
      ],
      
      [nlpService.intents.MAINTENANCE_QUERY]: [
        {
          subtype: 'scheduled_maintenance',
          patterns: [
            /scheduled/, /planned/, /upcoming/, /future/
          ],
          service: 'maintenanceService',
          method: 'getScheduledMaintenance'
        },
        {
          subtype: 'ongoing_maintenance',
          patterns: [
            /ongoing/, /current/, /in progress/, /active/
          ],
          service: 'maintenanceService',
          method: 'getActiveMaintenance'
        },
        {
          subtype: 'stand_maintenance',
          patterns: [
            /stand \w+/, /gate \w+/, /\w+\d+\w*/
          ],
          service: 'maintenanceService',
          method: 'getMaintenanceForStand'
        },
        {
          subtype: 'terminal_maintenance',
          patterns: [
            /terminal/, /^T\d/, /terminal \d/
          ],
          service: 'maintenanceService',
          method: 'getMaintenanceForTerminal'
        },
        {
          subtype: 'period_maintenance',
          patterns: [
            /time/, /period/, /during/, /today/, /tomorrow/, /next week/,
            /this month/, /between/
          ],
          service: 'maintenanceService',
          method: 'getMaintenanceForPeriod'
        },
        {
          // Default subtype
          subtype: 'general_maintenance',
          patterns: [],
          service: 'maintenanceService',
          method: 'getMaintenanceStatus'
        }
      ],
      
      [nlpService.intents.INFRASTRUCTURE_QUERY]: [
        {
          subtype: 'stand_info',
          patterns: [
            /stand \w+/, /gate \w+/, /\w+\d+\w*/, /stand details/, /gate details/
          ],
          service: 'infrastructureService',
          method: 'getStandInfo'
        },
        {
          subtype: 'terminal_info',
          patterns: [
            /terminal/, /^T\d/, /terminal \d/, /terminal details/, /terminal layout/
          ],
          service: 'infrastructureService',
          method: 'getTerminalInfo'
        },
        {
          subtype: 'stand_list',
          patterns: [
            /list stands/, /all stands/, /show stands/, /available stands/, /stands in/,
            /gates in/, /gates at/
          ],
          service: 'infrastructureService',
          method: 'listStands'
        },
        {
          subtype: 'airport_layout',
          patterns: [
            /layout/, /map/, /overview/, /structure/, /organization/, /arrangement/
          ],
          service: 'infrastructureService',
          method: 'getAirportLayout'
        },
        {
          // Default subtype
          subtype: 'general_infrastructure',
          patterns: [],
          service: 'infrastructureService',
          method: 'getInfrastructureInfo'
        }
      ],
      
      [nlpService.intents.STAND_STATUS_QUERY]: [
        {
          subtype: 'stand_availability',
          patterns: [
            /available/, /free/, /open/, /can use/, /can allocate/
          ],
          service: 'standService',
          method: 'getStandAvailability'
        },
        {
          subtype: 'stand_occupancy',
          patterns: [
            /occupied/, /in use/, /busy/, /utilized/, /utilization/
          ],
          service: 'standService',
          method: 'getStandOccupancy'
        },
        {
          subtype: 'stand_compatibility',
          patterns: [
            /compatible/, /can handle/, /can park/, /fit/, /accommodate/,
            /support/, /work with/
          ],
          service: 'standService',
          method: 'checkStandCompatibility'
        },
        {
          // Default subtype
          subtype: 'general_status',
          patterns: [],
          service: 'standService',
          method: 'getStandStatus'
        }
      ],
      
      [nlpService.intents.HELP_REQUEST]: [
        {
          subtype: 'general_help',
          patterns: [
            /help/, /guide/, /how to/, /what can you/, /capabilities/
          ],
          service: 'helpService',
          method: 'getGeneralHelp'
        },
        {
          subtype: 'capacity_help',
          patterns: [
            /capacity/, /how many/
          ],
          service: 'helpService',
          method: 'getCapacityHelp'
        },
        {
          subtype: 'maintenance_help',
          patterns: [
            /maintenance/, /repair/, /work/
          ],
          service: 'helpService',
          method: 'getMaintenanceHelp'
        },
        {
          subtype: 'infrastructure_help',
          patterns: [
            /infrastructure/, /stand/, /terminal/, /gate/, /airport/, /layout/
          ],
          service: 'helpService',
          method: 'getInfrastructureHelp'
        },
        {
          // Default subtype
          subtype: 'default_help',
          patterns: [],
          service: 'helpService',
          method: 'getGeneralHelp'
        }
      ]
    };
  }
  
  /**
   * Provide help content for general agent usage
   * Used as the implementation of the helpService
   * @returns {Object} - Help content
   */
  getGeneralHelp() {
    return {
      title: "Airport Capacity Planner AI Help",
      content: "I can help you with information about airport capacity, maintenance, infrastructure, and more. You can ask questions like:",
      examples: [
        "What's the current capacity for Terminal 1?",
        "Show me maintenance requests for Stand A12",
        "What stands can accommodate A380 aircraft?",
        "What's the status of Gate B22?",
        "Show me all stands in Terminal 2"
      ]
    };
  }
  
  /**
   * Provide help content for capacity queries
   * @returns {Object} - Capacity help content
   */
  getCapacityHelp() {
    return {
      title: "Capacity Query Help",
      content: "I can provide information about stand and terminal capacity. You can ask:",
      examples: [
        "What's the current capacity of Terminal 2?",
        "How many A320 aircraft can we handle per hour?",
        "Show me capacity metrics for the morning peak",
        "What's our total airport capacity?",
        "Which terminal has the highest capacity for widebody aircraft?"
      ]
    };
  }
  
  /**
   * Provide help content for maintenance queries
   * @returns {Object} - Maintenance help content
   */
  getMaintenanceHelp() {
    return {
      title: "Maintenance Query Help",
      content: "I can provide information about scheduled and ongoing maintenance. You can ask:",
      examples: [
        "What maintenance is scheduled for next week?",
        "Are there any stands under maintenance right now?",
        "Show me all maintenance requests for Terminal 1",
        "When is Stand A12 scheduled for maintenance?",
        "What's the impact of current maintenance on our capacity?"
      ]
    };
  }
  
  /**
   * Provide help content for infrastructure queries
   * @returns {Object} - Infrastructure help content
   */
  getInfrastructureHelp() {
    return {
      title: "Infrastructure Query Help",
      content: "I can provide information about airport infrastructure like stands, gates, and terminals. You can ask:",
      examples: [
        "Show me all stands in Terminal 3",
        "What are the specifications of Stand B15?",
        "How many international gates do we have?",
        "What's the layout of Terminal 2?",
        "Which stands can accommodate widebody aircraft?"
      ]
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
      
      // Determine the specific subtype of this query
      const { subtype, service: serviceId, method } = this.classifyQuerySubtype(intent, entities);
      
      console.log(`TOOL DEBUG: Classified query as subtype=${subtype}, service=${serviceId}, method=${method}`);
      console.log(`TOOL DEBUG: Entities:`, JSON.stringify(entities));
      
      if (!serviceId || !method) {
        // If no specific subtype is identified, fall back to the general intent mapping
        const actionInfo = nlpService.mapIntentToAction(intent);
        console.log(`TOOL DEBUG: No specific subtype found, using default mapping: service=${actionInfo.service}, method=${actionInfo.method}`);
        
        if (!actionInfo.service || !actionInfo.method) {
          logger.warn(`No tool mapping found for intent: ${intent}`);
          return {
            success: false,
            error: 'No appropriate tool found for this query',
            requiresApproval: false
          };
        }
        
        // Use the default mapping
        serviceId = actionInfo.service;
        method = actionInfo.method;
      }
      
      // Get the service
      const service = this.services[serviceId];
      console.log(`TOOL DEBUG: Looking up service '${serviceId}' - Available services:`, Object.keys(this.services));
      
      if (!service) {
        logger.error(`Service not found: ${serviceId}`);
        return {
          success: false,
          error: `Service ${serviceId} not found`,
          requiresApproval: false
        };
      }
      
      // Check if the method exists
      console.log(`TOOL DEBUG: Checking for method '${method}' in service - Available methods:`, Object.keys(service));
      if (typeof service[method] !== 'function') {
        logger.error(`Method not found: ${method} in service ${serviceId}`);
        return {
          success: false,
          error: `Method ${method} not found in service ${serviceId}`,
          requiresApproval: false
        };
      }
      
      // Determine if this action requires approval
      const requiresApproval = this.actionRequiresApproval(intent, method);
      
      // If this action requires approval, prepare the proposal instead of executing directly
      if (requiresApproval) {
        logger.info(`Action requires approval: ${serviceId}.${method}`);
        
        return {
          success: true,
          requiresApproval: true,
          actionType: intent,
          service: serviceId,
          method: method,
          parameters: this.mapEntitiesToParameters(intent, entities, subtype),
          description: this.generateActionDescription(intent, entities, subtype)
        };
      }
      
      // Execute the method with mapped parameters
      const parameters = this.mapEntitiesToParameters(intent, entities, subtype);
      logger.debug(`Executing ${serviceId}.${method} with parameters: ${JSON.stringify(parameters)}`);
      
      // Track query subtype metrics for learning
      this.trackQuerySubtype(intent, subtype);
      
      // Execute the service method
      const result = await this.executeServiceMethod(service, method, parameters);
      
      return {
        success: true,
        requiresApproval: false,
        data: result,
        querySubtype: subtype
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
   * Classify a query into a specific subtype based on intent and entities
   * @param {string} intent - The identified intent
   * @param {Object} entities - The extracted entities
   * @returns {Object} - The query subtype information
   */
  classifyQuerySubtype(intent, entities) {
    // Check if we have subtypes defined for this intent
    const subtypes = this.intentSubtypes[intent];
    if (!subtypes) {
      // No subtypes defined, use default action mapping
      const actionInfo = nlpService.mapIntentToAction(intent);
      return {
        subtype: 'general',
        service: actionInfo.service,
        method: actionInfo.method
      };
    }
    
    // Convert query to lowercase for pattern matching
    const query = entities.originalQuery ? entities.originalQuery.toLowerCase() : '';
    
    // Check each subtype pattern
    for (const subtypeInfo of subtypes) {
      // Skip the default subtype (empty patterns array) during initial matching
      if (subtypeInfo.patterns.length === 0) continue;
      
      // Check if any pattern matches the query
      for (const pattern of subtypeInfo.patterns) {
        if (pattern.test(query)) {
          logger.debug(`Query matched subtype: ${subtypeInfo.subtype}`);
          return {
            subtype: subtypeInfo.subtype,
            service: subtypeInfo.service,
            method: subtypeInfo.method
          };
        }
      }
    }
    
    // If no specific pattern matched, check for key entities that could determine the subtype
    if (entities.terminal && !entities.stand) {
      // Query about a specific terminal
      const terminalSubtype = subtypes.find(st => st.subtype.includes('terminal'));
      if (terminalSubtype) {
        logger.debug(`Query matched entity-based subtype: ${terminalSubtype.subtype}`);
        return {
          subtype: terminalSubtype.subtype,
          service: terminalSubtype.service,
          method: terminalSubtype.method
        };
      }
    }
    
    if (entities.stand && !entities.terminal) {
      // Query about a specific stand
      const standSubtype = subtypes.find(st => st.subtype.includes('stand'));
      if (standSubtype) {
        logger.debug(`Query matched entity-based subtype: ${standSubtype.subtype}`);
        return {
          subtype: standSubtype.subtype,
          service: standSubtype.service,
          method: standSubtype.method
        };
      }
    }
    
    if (entities.aircraft_type) {
      // Query about a specific aircraft type
      const aircraftSubtype = subtypes.find(st => st.subtype.includes('aircraft'));
      if (aircraftSubtype) {
        logger.debug(`Query matched entity-based subtype: ${aircraftSubtype.subtype}`);
        return {
          subtype: aircraftSubtype.subtype,
          service: aircraftSubtype.service,
          method: aircraftSubtype.method
        };
      }
    }
    
    if (entities.time_period) {
      // Query about a specific time period
      const periodSubtype = subtypes.find(st => st.subtype.includes('period'));
      if (periodSubtype) {
        logger.debug(`Query matched entity-based subtype: ${periodSubtype.subtype}`);
        return {
          subtype: periodSubtype.subtype,
          service: periodSubtype.service,
          method: periodSubtype.method
        };
      }
    }
    
    // If no specific subtype matched, use the default for this intent
    const defaultSubtype = subtypes.find(st => st.patterns.length === 0);
    if (defaultSubtype) {
      logger.debug(`Using default subtype: ${defaultSubtype.subtype}`);
      return {
        subtype: defaultSubtype.subtype,
        service: defaultSubtype.service,
        method: defaultSubtype.method
      };
    }
    
    // Fallback to general action mapping if no default subtype is defined
    const actionInfo = nlpService.mapIntentToAction(intent);
    return {
      subtype: 'general',
      service: actionInfo.service,
      method: actionInfo.method
    };
  }
  
  /**
   * Determine if an action requires approval
   * @param {string} intent - The intent
   * @param {string} method - The method
   * @returns {boolean} - Whether approval is required
   */
  actionRequiresApproval(intent, method) {
    // Actions that modify data require approval
    const modifyingMethods = [
      'create', 'update', 'delete', 'remove', 'add', 'set', 'schedule',
      'allocate', 'close', 'open', 'modify', 'edit'
    ];
    
    // Check if the method name contains any modifying terms
    const requiresApproval = modifyingMethods.some(term => 
      method.toLowerCase().includes(term)
    );
    
    // Specific intents that always require approval
    const approvalIntents = [
      nlpService.intents.MAINTENANCE_CREATE,
      nlpService.intents.MAINTENANCE_UPDATE,
      nlpService.intents.CAPACITY_PARAMETER_UPDATE,
      nlpService.intents.AUTONOMOUS_SETTING
    ];
    
    return requiresApproval || approvalIntents.includes(intent);
  }
  
  /**
   * Track query subtype for learning and metrics
   * @param {string} intent - The query intent
   * @param {string} subtype - The query subtype
   */
  trackQuerySubtype(intent, subtype) {
    // Add simple tracking for query distribution (this could be expanded in the future)
    // Future enhancement: Store this in a database for analytics
    try {
      // For now, just log it
      logger.debug(`Query subtype tracked: ${intent} -> ${subtype}`);
    } catch (error) {
      // Don't let tracking errors affect the main flow
      logger.error(`Error tracking query subtype: ${error.message}`);
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
    try {
      // Check if the method exists
      if (typeof service[method] !== 'function') {
        // Try to call a generic method if the specific one doesn't exist
        if (method.startsWith('get') && typeof service.getData === 'function') {
          logger.warn(`Method ${method} not found, falling back to getData`);
          parameters.requestedMethod = method; // Pass the original method for context
          return await service.getData(parameters);
        }
        throw new Error(`Method ${method} not found in service`);
      }
      
      // Get method signature to determine how to pass parameters
      const methodString = service[method].toString();
      
      // Check if method accepts a single parameters object or individual parameters
      if (methodString.includes('function') && methodString.match(/function\s*\(([^)]*)\)/)) {
        const argsMatch = methodString.match(/function\s*\(([^)]*)\)/);
        if (argsMatch && argsMatch[1]) {
          const paramNames = argsMatch[1].split(',').map(p => p.trim());
          
          // If method has named parameters, extract them from parameters object
          if (paramNames.length > 1 && paramNames[0] !== '' && !paramNames[0].includes('options')) {
            const args = paramNames.map(name => {
              // Map special parameter names
              if (name === 'options' || name === 'opts') {
                return parameters;
              }
              // Remove common prefixes for parameter matching
              const cleanName = name.replace(/^_/, '').replace(/^param/, '');
              
              // Try to find matching parameter
              for (const [key, value] of Object.entries(parameters)) {
                if (key.toLowerCase() === cleanName.toLowerCase() || 
                    key.toLowerCase().includes(cleanName.toLowerCase())) {
                  return value;
                }
              }
              return undefined; // Parameter not found
            });
            
            logger.debug(`Calling ${method} with individual parameters: ${JSON.stringify(args)}`);
            return await service[method](...args);
          }
        }
      }
      
      // Special case handling for known methods
      if (method === 'calculateCapacity' || method === 'calculateStandCapacity') {
        const { terminal, aircraft_type, stand, time_period, start_date, end_date } = parameters;
        
        // Build options object for capacity calculation
        const options = {
          terminal: terminal,
          aircraftType: aircraft_type,
          stand: stand,
          timeRange: { start: start_date, end: end_date }
        };
        
        return await service[method](options);
      } 
      else if (method === 'calculateCapacityForTimeSlot') {
        const { terminal, aircraft_type, stand, time_period, start_date, end_date } = parameters;
        
        // Get time slot details from time period
        const timeSlot = time_period || 'peak';
        const options = {
          terminal: terminal,
          aircraftType: aircraft_type,
          stand: stand,
          timeRange: { start: start_date, end: end_date }
        };
        
        return await service[method](timeSlot, options);
      }
      else if (method === 'getMaintenanceStatus' || method === 'getScheduledMaintenance' || 
               method === 'getActiveMaintenance') {
        const { stand, terminal, time_period, start_date, end_date, status } = parameters;
        return await service[method](stand, terminal, 
          time_period || { start: start_date, end: end_date }, status);
      }
      else if (method === 'getInfrastructureInfo' || method === 'getStandInfo' || 
               method === 'getTerminalInfo') {
        const { terminal, stand, detail_level } = parameters;
        return await service[method](terminal, stand, detail_level);
      }
      else if (method === 'getStandStatus' || method === 'getStandAvailability' || 
               method === 'checkStandCompatibility') {
        const { stand, aircraft_type, start_date, end_date } = parameters;
        return await service[method](stand, aircraft_type, { start: start_date, end: end_date });
      }
      else {
        // For other methods, pass the entire parameters object
        logger.debug(`Calling ${method} with parameters object: ${JSON.stringify(parameters)}`);
        return await service[method](parameters);
      }
    } catch (error) {
      logger.error(`Service method execution error for ${method}: ${error.message}`);
      throw new Error(`Failed to execute service method: ${error.message}`);
    }
  }

  /**
   * Map extracted entities to service method parameters
   * @param {string} intent - The identified intent
   * @param {Object} entities - The extracted entities
   * @param {string} subtype - The query subtype
   * @returns {Object} - The mapped parameters
   */
  mapEntitiesToParameters(intent, entities, subtype = 'general') {
    // Create a clean parameters object with just the necessary values
    const parameters = {};
    
    // Always include the original query for context
    parameters.originalQuery = entities.originalQuery || '';
    
    // Process time expressions
    if (entities.time_period) {
      const timeInfo = nlpService.processTimeExpression(entities.time_period);
      if (timeInfo && timeInfo.type !== 'error' && timeInfo.type !== 'unknown') {
        parameters.time_period = entities.time_period;
        parameters.processed_time = timeInfo;
        
        // Add formatted dates for easier service consumption
        if (timeInfo.iso) {
          parameters.start_date = timeInfo.iso.start;
          parameters.end_date = timeInfo.iso.end;
        }
      } else {
        parameters.time_period = entities.time_period;
      }
    } else {
      // Default to current day if no time specified
      const today = new Date();
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      parameters.processed_time = {
        type: 'day',
        start: today,
        end: todayEnd,
        expression: 'today',
        iso: {
          start: today.toISOString(),
          end: todayEnd.toISOString()
        }
      };
      
      parameters.start_date = today.toISOString();
      parameters.end_date = todayEnd.toISOString();
    }
    
    // Map common entities 
    if (entities.terminal) parameters.terminal = entities.terminal;
    if (entities.stand) parameters.stand = entities.stand;
    if (entities.aircraft_type) parameters.aircraft_type = entities.aircraft_type;
    if (entities.airline) parameters.airline = entities.airline;
    if (entities.status) parameters.status = entities.status;
    if (entities.metric) parameters.metric = entities.metric;
    
    // Subtype-specific parameter mapping
    switch (intent) {
      case nlpService.intents.CAPACITY_QUERY:
        // Additional capacity-specific parameters
        if (subtype === 'overall_capacity') {
          parameters.scope = 'airport';
        } else if (subtype === 'terminal_capacity') {
          parameters.scope = 'terminal';
          // Ensure terminal is included
          if (!parameters.terminal && entities.terminal) {
            parameters.terminal = entities.terminal;
          }
        } else if (subtype === 'stand_capacity') {
          parameters.scope = 'stand';
          // Ensure stand is included
          if (!parameters.stand && entities.stand) {
            parameters.stand = entities.stand;
          }
        } else if (subtype === 'aircraft_type_capacity') {
          parameters.scope = 'aircraft_type';
          // Ensure aircraft_type is included
          if (!parameters.aircraft_type && entities.aircraft_type) {
            parameters.aircraft_type = entities.aircraft_type;
          }
        } else if (subtype === 'period_capacity') {
          parameters.scope = 'time_period';
          // Keep the processed time information
        }
        
        // Add any capacity metrics mentioned
        if (entities.metric) {
          parameters.metric = entities.metric;
        } else {
          parameters.metric = 'utilization';  // Default metric
        }
        break;
        
      case nlpService.intents.MAINTENANCE_QUERY:
        // Additional maintenance-specific parameters
        if (subtype === 'scheduled_maintenance') {
          parameters.status = 'scheduled';
        } else if (subtype === 'ongoing_maintenance') {
          parameters.status = 'in_progress';
        } else if (subtype === 'stand_maintenance') {
          // Ensure stand is included
          if (!parameters.stand && entities.stand) {
            parameters.stand = entities.stand;
          }
        } else if (subtype === 'terminal_maintenance') {
          // Ensure terminal is included
          if (!parameters.terminal && entities.terminal) {
            parameters.terminal = entities.terminal;
          }
        }
        
        // Include any mentioned status
        if (entities.status) {
          parameters.status = entities.status;
        }
        break;
        
      case nlpService.intents.INFRASTRUCTURE_QUERY:
        // Additional infrastructure-specific parameters
        if (subtype === 'stand_info') {
          parameters.entity_type = 'stand';
          // Ensure stand is included
          if (!parameters.stand && entities.stand) {
            parameters.stand = entities.stand;
          }
        } else if (subtype === 'terminal_info') {
          parameters.entity_type = 'terminal';
          // Ensure terminal is included
          if (!parameters.terminal && entities.terminal) {
            parameters.terminal = entities.terminal;
          }
        } else if (subtype === 'stand_list') {
          parameters.entity_type = 'stand';
          parameters.list = true;
          
          // Add filters if available
          if (entities.terminal) parameters.terminal = entities.terminal;
          if (entities.aircraft_type) parameters.aircraft_type = entities.aircraft_type;
          if (entities.status) parameters.status = entities.status;
        } else if (subtype === 'airport_layout') {
          parameters.entity_type = 'airport';
          parameters.detail_level = 'full';
        }
        break;
        
      case nlpService.intents.STAND_STATUS_QUERY:
        // Additional stand status specific parameters
        if (subtype === 'stand_availability') {
          parameters.check_type = 'availability';
        } else if (subtype === 'stand_occupancy') {
          parameters.check_type = 'occupancy';
        } else if (subtype === 'stand_compatibility') {
          parameters.check_type = 'compatibility';
          // Ensure aircraft_type is included
          if (!parameters.aircraft_type && entities.aircraft_type) {
            parameters.aircraft_type = entities.aircraft_type;
          }
        }
        
        // Ensure stand is included if available
        if (!parameters.stand && entities.stand) {
          parameters.stand = entities.stand;
        }
        break;
        
      case nlpService.intents.HELP_REQUEST:
        // No additional parameters needed for help intents
        break;
        
      default:
        // For other intents, include all entities as parameters
        Object.keys(entities).forEach(key => {
          if (key !== 'originalQuery' && key !== 'preprocessedQuery') {
            parameters[key] = entities[key];
          }
        });
    }
    
    return parameters;
  }

  /**
   * Generate a human-readable description of an action
   * @param {string} intent - The identified intent
   * @param {Object} entities - The extracted entities
   * @param {string} subtype - The query subtype
   * @returns {string} - The action description
   */
  generateActionDescription(intent, entities, subtype = 'general') {
    // Create a more specific description based on the subtype
    switch (intent) {
      case nlpService.intents.MAINTENANCE_CREATE:
        return `Create maintenance request for ${
          entities.stand ? `stand ${entities.stand}` : 
          entities.terminal ? `terminal ${entities.terminal}` : 'airport area'
        } ${
          entities.time_period ? `during ${entities.time_period}` : ''
        } ${
          entities.status ? `with status "${entities.status}"` : ''
        }`;
        
      case nlpService.intents.MAINTENANCE_UPDATE:
        return `Update maintenance request ${
          entities.request_id ? `#${entities.request_id}` : ''
        } for ${
          entities.stand ? `stand ${entities.stand}` : 
          entities.terminal ? `terminal ${entities.terminal}` : 'airport area'
        } ${
          entities.time_period ? `during ${entities.time_period}` : ''
        } ${
          entities.status ? `to status "${entities.status}"` : ''
        }`;
        
      case nlpService.intents.CAPACITY_PARAMETER_UPDATE:
        return `Update capacity parameters ${
          entities.parameter ? `for ${entities.parameter}` : ''
        } ${
          entities.value ? `to ${entities.value}` : ''
        }`;
        
      case nlpService.intents.SCENARIO_CREATE:
        return `Create a new scenario ${
          entities.name ? `called "${entities.name}"` : ''
        } ${
          entities.description ? `with description "${entities.description}"` : ''
        }`;
        
      case nlpService.intents.SCENARIO_MODIFY:
        return `Modify scenario ${
          entities.scenario_id ? `#${entities.scenario_id}` : 
          entities.name ? `"${entities.name}"` : ''
        } ${
          entities.parameter ? `by changing ${entities.parameter}` : ''
        }`;
        
      case nlpService.intents.STAND_STATUS_QUERY:
        if (subtype === 'stand_availability') {
          return `Check availability of ${
            entities.stand ? `stand ${entities.stand}` : 'stands'
          } ${
            entities.time_period ? `during ${entities.time_period}` : ''
          }`;
        } else if (subtype === 'stand_compatibility') {
          return `Check compatibility of ${
            entities.aircraft_type ? `aircraft type ${entities.aircraft_type}` : 'aircraft'
          } with ${
            entities.stand ? `stand ${entities.stand}` : 'stands'
          }`;
        }
        return `Check status of ${
          entities.stand ? `stand ${entities.stand}` : 'stands'
        } ${
          entities.time_period ? `during ${entities.time_period}` : ''
        }`;
        
      default:
        // Create a more specific description based on the entities
        let description = `Execute ${intent.replace(/_/g, ' ')}`;
        
        // Add entity details to the description
        const entityDescriptions = [];
        if (entities.terminal) entityDescriptions.push(`terminal ${entities.terminal}`);
        if (entities.stand) entityDescriptions.push(`stand ${entities.stand}`);
        if (entities.aircraft_type) entityDescriptions.push(`aircraft type ${entities.aircraft_type}`);
        if (entities.airline) entityDescriptions.push(`airline ${entities.airline}`);
        if (entities.time_period) entityDescriptions.push(`during ${entities.time_period}`);
        
        if (entityDescriptions.length > 0) {
          description += ` for ${entityDescriptions.join(', ')}`;
        }
        
        return description;
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