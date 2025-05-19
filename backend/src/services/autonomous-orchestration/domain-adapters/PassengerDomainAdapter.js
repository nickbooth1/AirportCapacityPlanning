/**
 * Passenger Domain Adapter
 * 
 * Adapter for the Passenger domain, connecting the autonomous orchestration
 * engine to the passenger experience and flow management services.
 */

const BaseDomainAdapter = require('./BaseDomainAdapter');
const logger = require('../../../utils/logger');

class PassengerDomainAdapter extends BaseDomainAdapter {
  constructor(options = {}) {
    super({
      ...options,
      domainName: 'PASSENGER'
    });
    
    // Domain-specific services
    this.passengerExperienceService = options.passengerExperienceService;
    this.journeyManagementService = options.journeyManagementService;
    this.passengerCommunicationService = options.passengerCommunicationService;
    
    // Additional components
    this.cacheService = options.cacheService;
  }

  /**
   * Domain-specific initialization
   */
  async _initializeDomain() {
    if (!this.passengerExperienceService) {
      throw new Error('Passenger Experience Service is required for Passenger Domain Adapter');
    }
    
    if (!this.journeyManagementService) {
      throw new Error('Journey Management Service is required for Passenger Domain Adapter');
    }
    
    // Passenger Communication Service is optional
    if (this.passengerCommunicationService) {
      logger.info('Passenger Communication Service is available');
    } else {
      logger.warn('Passenger Communication Service is not available, communication actions will be limited');
    }
    
    // Initialize domain cache if available
    if (this.cacheService) {
      await this.cacheService.initializeCache('passenger_domain');
    }
    
    // Check connectivity to required services
    await this._checkServicesConnectivity();
    
    logger.info('Passenger Domain Adapter successfully initialized domain services');
  }

  /**
   * Map generic action to domain-specific format
   */
  _mapToDomainAction(action) {
    // Convert general orchestration action to passenger-specific action
    switch (action.type) {
      case 'OPTIMIZE_PASSENGER_FLOW':
        return {
          type: 'optimizePassengerFlow',
          parameters: {
            areaId: action.parameters.areaId,
            timeRange: action.parameters.timeRange,
            flowRate: action.parameters.flowRate,
            constraints: action.parameters.constraints || {}
          }
        };
        
      case 'CREATE_JOURNEY_INTERVENTION':
        return {
          type: 'createJourneyIntervention',
          parameters: {
            interventionType: action.parameters.interventionType,
            targetJourneyIds: action.parameters.targetJourneyIds || [],
            targetCriteria: action.parameters.targetCriteria,
            description: action.parameters.description,
            expectedImpact: action.parameters.expectedImpact || {},
            implementationMethod: action.parameters.implementationMethod,
            executionTiming: action.parameters.executionTiming || 'immediate'
          }
        };
        
      case 'SEND_PASSENGER_NOTIFICATIONS':
        return {
          type: 'sendPassengerNotifications',
          parameters: {
            recipients: action.parameters.recipients,
            notificationType: action.parameters.notificationType,
            message: action.parameters.message,
            channels: action.parameters.channels || ['app', 'email'],
            priority: action.parameters.priority || 'normal',
            metadata: action.parameters.metadata || {}
          }
        };
        
      case 'ANALYZE_EXPERIENCE_METRICS':
        return {
          type: 'analyzeExperienceMetrics',
          parameters: {
            timeRange: action.parameters.timeRange,
            areaIds: action.parameters.areaIds,
            metricTypes: action.parameters.metricTypes || ['satisfaction', 'wait_time', 'throughput'],
            segmentation: action.parameters.segmentation || {},
            detailedAnalysis: action.parameters.detailedAnalysis || false
          }
        };
        
      default:
        throw new Error(`Unsupported action type for Passenger domain: ${action.type}`);
    }
  }

  /**
   * Execute domain-specific action
   */
  async _executeDomainAction(domainAction) {
    logger.info(`Executing passenger domain action: ${domainAction.type}`);
    
    switch (domainAction.type) {
      case 'optimizePassengerFlow':
        return this.journeyManagementService.optimizeFlow(
          domainAction.parameters.areaId,
          domainAction.parameters.timeRange,
          domainAction.parameters.flowRate,
          domainAction.parameters.constraints
        );
        
      case 'createJourneyIntervention':
        return this.journeyManagementService.createIntervention({
          interventionType: domainAction.parameters.interventionType,
          targetJourneyIds: domainAction.parameters.targetJourneyIds,
          targetCriteria: domainAction.parameters.targetCriteria,
          description: domainAction.parameters.description,
          expectedImpact: domainAction.parameters.expectedImpact,
          implementationMethod: domainAction.parameters.implementationMethod,
          executionTiming: domainAction.parameters.executionTiming
        });
        
      case 'sendPassengerNotifications':
        // Check if communication service is available
        if (!this.passengerCommunicationService) {
          throw new Error('Passenger Communication Service not available');
        }
        
        return this.passengerCommunicationService.sendNotifications(
          domainAction.parameters.recipients,
          domainAction.parameters.notificationType,
          domainAction.parameters.message,
          {
            channels: domainAction.parameters.channels,
            priority: domainAction.parameters.priority,
            metadata: domainAction.parameters.metadata
          }
        );
        
      case 'analyzeExperienceMetrics':
        return this.passengerExperienceService.analyzeMetrics(
          domainAction.parameters.timeRange,
          domainAction.parameters.areaIds,
          domainAction.parameters.metricTypes,
          {
            segmentation: domainAction.parameters.segmentation,
            detailedAnalysis: domainAction.parameters.detailedAnalysis
          }
        );
        
      default:
        throw new Error(`Unsupported domain action type: ${domainAction.type}`);
    }
  }

  /**
   * Map domain result to standard format
   */
  _mapFromDomainResult(result) {
    // Convert domain-specific result to standardized orchestration result
    if (!result) {
      return { success: false, message: 'No result returned from domain service' };
    }
    
    // Basic success response format
    const standardResult = {
      success: true,
      domainResult: result
    };
    
    // Add domain-specific metrics if available
    if (result.metrics) {
      standardResult.metrics = result.metrics;
    }
    
    // Add domain-specific impact if available
    if (result.impact) {
      standardResult.impact = result.impact;
    }
    
    // Add affected passengers information if available
    if (result.affectedPassengers) {
      standardResult.affectedPassengers = result.affectedPassengers;
    }
    
    // Add notification delivery stats if available
    if (result.deliveryStats) {
      standardResult.deliveryStats = result.deliveryStats;
    }
    
    return standardResult;
  }

  /**
   * Get domain-specific state
   */
  async _getDomainState() {
    try {
      // Get current passenger state from services
      const experienceMetrics = await this.passengerExperienceService.getCurrentMetrics();
      const journeyState = await this.journeyManagementService.getCurrentState();
      
      // Get communication state if available
      let communicationState = { available: false };
      if (this.passengerCommunicationService) {
        communicationState = await this.passengerCommunicationService.getState();
        communicationState.available = true;
      }
      
      // Combine into complete domain state
      return {
        timestamp: new Date().toISOString(),
        experienceMetrics,
        journeyState,
        communicationState,
        serviceStatus: {
          passengerExperienceService: true,
          journeyManagementService: true,
          passengerCommunicationService: !!this.passengerCommunicationService
        }
      };
    } catch (error) {
      logger.error(`Error getting passenger domain state: ${error.message}`);
      
      // Return partial state with service status
      return {
        timestamp: new Date().toISOString(),
        serviceStatus: {
          passengerExperienceService: error.source !== 'passengerExperienceService',
          journeyManagementService: error.source !== 'journeyManagementService',
          passengerCommunicationService: error.source !== 'passengerCommunicationService' && !!this.passengerCommunicationService
        },
        error: error.message
      };
    }
  }

  /**
   * Calculate domain-specific impact
   */
  _calculateDomainImpact(action, state) {
    // Calculate the impact of this action on passenger domain
    switch (action.type) {
      case 'OPTIMIZE_PASSENGER_FLOW':
        return {
          passengerImpact: {
            waitTimeChange: 'decrease',
            satisfactionChange: 'increase',
            throughputChange: 'increase',
            experienceDisruption: 'low',
            score: 0.85 // 0-1 score representing overall passenger impact
          }
        };
        
      case 'CREATE_JOURNEY_INTERVENTION':
        // The impact depends on the intervention type
        const interventionType = action.parameters.interventionType;
        
        if (interventionType === 'queue_management') {
          return {
            passengerImpact: {
              waitTimeChange: 'decrease',
              satisfactionChange: 'increase',
              throughputChange: 'increase',
              experienceDisruption: 'low',
              score: 0.8
            }
          };
        } else if (interventionType === 'path_redirection') {
          return {
            passengerImpact: {
              waitTimeChange: 'decrease',
              satisfactionChange: 'neutral',
              throughputChange: 'increase',
              experienceDisruption: 'medium',
              score: 0.7
            }
          };
        } else if (interventionType === 'facility_reallocation') {
          return {
            passengerImpact: {
              waitTimeChange: 'decrease',
              satisfactionChange: 'neutral',
              throughputChange: 'increase',
              experienceDisruption: 'high',
              score: 0.6
            }
          };
        } else {
          return {
            passengerImpact: {
              waitTimeChange: 'unknown',
              satisfactionChange: 'unknown',
              throughputChange: 'unknown',
              experienceDisruption: 'medium',
              score: 0.5
            }
          };
        }
        
      case 'SEND_PASSENGER_NOTIFICATIONS':
        return {
          passengerImpact: {
            waitTimeChange: 'neutral',
            satisfactionChange: 'increase',
            throughputChange: 'neutral',
            experienceDisruption: 'low',
            score: 0.7
          }
        };
        
      case 'ANALYZE_EXPERIENCE_METRICS':
        return {
          passengerImpact: {
            waitTimeChange: 'none',
            satisfactionChange: 'none',
            throughputChange: 'none',
            experienceDisruption: 'none',
            score: 0.1 // Analysis has minimal direct impact
          }
        };
        
      default:
        return {
          passengerImpact: {
            waitTimeChange: 'unknown',
            satisfactionChange: 'unknown',
            throughputChange: 'unknown',
            experienceDisruption: 'unknown',
            score: 0.5
          }
        };
    }
  }

  /**
   * Get domain-specific constraints
   */
  _getDomainConstraints(state) {
    // Get current constraints from domain state
    if (!state || !state.experienceMetrics) {
      return []; // No constraints if state is incomplete
    }
    
    const constraints = [];
    
    // Add constraint for maximum notification frequency
    constraints.push({
      type: 'MAX_NOTIFICATION_FREQUENCY',
      value: 30, // minutes between notifications
      description: 'Minimum time between notifications to same passenger'
    });
    
    // Add constraint for minimum wait time improvement
    constraints.push({
      type: 'MIN_WAIT_TIME_IMPROVEMENT',
      value: 0.15, // 15% minimum wait time reduction
      description: 'Minimum wait time improvement to justify intervention'
    });
    
    // Add constraints based on current state
    if (state.journeyState && state.journeyState.activeInterventions > 3) {
      constraints.push({
        type: 'MAX_CONCURRENT_INTERVENTIONS',
        value: 5,
        currentValue: state.journeyState.activeInterventions,
        description: 'Maximum number of concurrent interventions'
      });
    }
    
    // Add constraint for passenger satisfaction threshold
    if (state.experienceMetrics && state.experienceMetrics.overallSatisfaction < 3.5) {
      constraints.push({
        type: 'SATISFACTION_THRESHOLD',
        value: 3.5,
        currentValue: state.experienceMetrics.overallSatisfaction,
        description: 'Current satisfaction below threshold - prioritize satisfaction improvement'
      });
    }
    
    return constraints;
  }

  /**
   * Validate action against constraints
   */
  _validateActionAgainstConstraints(action, constraints, state) {
    // Validate if the action violates any constraints
    if (!constraints || constraints.length === 0) {
      return { valid: true };
    }
    
    // Check each constraint
    for (const constraint of constraints) {
      if (constraint.type === 'MAX_CONCURRENT_INTERVENTIONS') {
        // For journey interventions, check if we're at the limit
        if (action.type === 'CREATE_JOURNEY_INTERVENTION') {
          if (constraint.currentValue >= constraint.value) {
            return {
              valid: false,
              error: `Maximum concurrent interventions (${constraint.value}) already reached`,
              constraint
            };
          }
        }
      }
      
      if (constraint.type === 'MAX_NOTIFICATION_FREQUENCY') {
        // For passenger notifications, we should check the last notification time
        // but we'll just add a warning for this example
        if (action.type === 'SEND_PASSENGER_NOTIFICATIONS') {
          return {
            valid: true,
            warnings: [{
              type: 'NOTIFICATION_FREQUENCY_CHECK_REQUIRED',
              message: `Ensure recipients haven't received notifications in the last ${constraint.value} minutes`,
              constraint
            }]
          };
        }
      }
    }
    
    // All constraints checked, action is valid
    return { valid: true };
  }

  /**
   * Get domain-specific metrics
   */
  async _getDomainMetrics() {
    try {
      // Get metrics from the passenger services
      const experienceMetrics = await this.passengerExperienceService.getMetrics();
      const journeyMetrics = await this.journeyManagementService.getPerformanceMetrics();
      
      // Get communication metrics if available
      let communicationMetrics = {};
      if (this.passengerCommunicationService) {
        communicationMetrics = await this.passengerCommunicationService.getDeliveryMetrics();
      }
      
      return {
        overallSatisfaction: experienceMetrics.overallSatisfaction || 0,
        averageWaitTime: experienceMetrics.averageWaitTime || 0,
        throughputRate: experienceMetrics.throughputRate || 0,
        activeJourneys: journeyMetrics.activeJourneys || 0,
        completedJourneys: journeyMetrics.completedJourneys || 0,
        activeInterventions: journeyMetrics.activeInterventions || 0,
        notificationDeliveryRate: communicationMetrics.deliveryRate || 0,
        lastMetricsUpdate: experienceMetrics.timestamp
      };
    } catch (error) {
      logger.error(`Error getting passenger domain metrics: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Get domain-specific dependencies for an action
   */
  _getDomainDependencies(action) {
    // No default dependencies
    return [];
  }
  
  /**
   * Get domain-specific timing constraints for an action
   */
  _getDomainTimingConstraints(action) {
    switch (action.type) {
      case 'OPTIMIZE_PASSENGER_FLOW':
        return {
          estimated_duration_ms: 10000, // 10 seconds
          max_duration_ms: 30000, // 30 seconds
          priority: 'high'
        };
        
      case 'CREATE_JOURNEY_INTERVENTION':
        return {
          estimated_duration_ms: 8000, // 8 seconds
          max_duration_ms: 20000, // 20 seconds
          priority: 'high'
        };
        
      case 'SEND_PASSENGER_NOTIFICATIONS':
        return {
          estimated_duration_ms: 15000, // 15 seconds
          max_duration_ms: 60000, // 1 minute
          priority: 'medium'
        };
        
      case 'ANALYZE_EXPERIENCE_METRICS':
        return {
          estimated_duration_ms: 12000, // 12 seconds
          max_duration_ms: 40000, // 40 seconds
          priority: 'low'
        };
        
      default:
        return {
          estimated_duration_ms: 10000, // 10 seconds (default)
          max_duration_ms: 30000, // 30 seconds (default)
          priority: 'medium'
        };
    }
  }
  
  /**
   * Handle domain-specific failure
   */
  _handleDomainFailure(action, error) {
    // Handle passenger domain specific failures
    switch (action.type) {
      case 'OPTIMIZE_PASSENGER_FLOW':
        // For flow optimization failures, we might want to retry with a smaller area
        if (error.message.includes('area too large') || error.message.includes('complexity')) {
          // If the area is a composite area, try with a smaller subsection
          return { 
            type: 'ABORT_PLAN', 
            reason: 'Flow optimization failed - consider breaking into smaller areas'
          };
        }
        break;
        
      case 'CREATE_JOURNEY_INTERVENTION':
        // For intervention failures, we might skip and continue with the plan
        if (error.message.includes('resource unavailable')) {
          return { 
            type: 'SKIP', 
            reason: 'Intervention creation failed due to resource unavailability - continuing with plan'
          };
        }
        break;
        
      case 'SEND_PASSENGER_NOTIFICATIONS':
        // For notification failures, we might retry with different channels
        if (error.message.includes('channel unavailable')) {
          // If some channels are unavailable, try with just app notifications
          return { 
            type: 'RETRY', 
            reason: 'Notification channel unavailable - retrying with app only',
            modifiedAction: {
              ...action,
              parameters: {
                ...action.parameters,
                channels: ['app']
              }
            }
          };
        }
        break;
        
      case 'ANALYZE_EXPERIENCE_METRICS':
        // For analysis failures, we can always skip
        return { 
          type: 'SKIP', 
          reason: 'Metrics analysis failed but not critical to plan execution'
        };
    }
    
    // Default handling: abort the plan
    return { type: 'ABORT_PLAN', reason: error.message };
  }

  /**
   * Check connectivity to required services
   */
  async _checkServicesConnectivity() {
    // Check passenger experience service
    try {
      await this.passengerExperienceService.healthCheck();
    } catch (error) {
      throw new Error(`Passenger Experience Service connectivity issue: ${error.message}`);
    }
    
    // Check journey management service
    try {
      await this.journeyManagementService.healthCheck();
    } catch (error) {
      throw new Error(`Journey Management Service connectivity issue: ${error.message}`);
    }
    
    // Check communication service if available
    if (this.passengerCommunicationService) {
      try {
        await this.passengerCommunicationService.healthCheck();
      } catch (error) {
        logger.warn(`Passenger Communication Service connectivity issue: ${error.message}`);
        // Don't throw here, as the service is optional
      }
    }
  }
}

module.exports = PassengerDomainAdapter;