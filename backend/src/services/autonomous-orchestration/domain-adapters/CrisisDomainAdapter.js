/**
 * Crisis Domain Adapter
 * 
 * Adapter for the Crisis domain, connecting the autonomous orchestration
 * engine to the disruption management, emergency response, and recovery services.
 */

const BaseDomainAdapter = require('./BaseDomainAdapter');
const logger = require('../../../utils/logger');

class CrisisDomainAdapter extends BaseDomainAdapter {
  constructor(options = {}) {
    super({
      ...options,
      domainName: 'CRISIS'
    });
    
    // Domain-specific services
    this.disruptionManagementService = options.disruptionManagementService;
    this.emergencyResponseService = options.emergencyResponseService;
    this.recoveryService = options.recoveryService;
    
    // Additional components
    this.cacheService = options.cacheService;
    this.alertService = options.alertService;
  }

  /**
   * Domain-specific initialization
   */
  async _initializeDomain() {
    if (!this.disruptionManagementService) {
      throw new Error('Disruption Management Service is required for Crisis Domain Adapter');
    }
    
    if (!this.emergencyResponseService) {
      throw new Error('Emergency Response Service is required for Crisis Domain Adapter');
    }
    
    if (!this.recoveryService) {
      throw new Error('Recovery Service is required for Crisis Domain Adapter');
    }
    
    // Alert service is optional but highly recommended
    if (this.alertService) {
      logger.info('Alert Service is available for Crisis Domain');
    } else {
      logger.warn('Alert Service is not available, crisis notification capabilities will be limited');
    }
    
    // Initialize domain cache if available
    if (this.cacheService) {
      await this.cacheService.initializeCache('crisis_domain', { 
        priority: 'high',
        ttl: 60  // Short TTL for crisis data (60 seconds)
      });
    }
    
    // Check connectivity to required services
    await this._checkServicesConnectivity();
    
    logger.info('Crisis Domain Adapter successfully initialized domain services');
  }

  /**
   * Map generic action to domain-specific format
   */
  _mapToDomainAction(action) {
    // Convert general orchestration action to crisis-specific action
    switch (action.type) {
      case 'DETECT_DISRUPTIVE_EVENT':
        return {
          type: 'detectDisruptiveEvent',
          parameters: {
            eventTypes: action.parameters.eventTypes || ['all'],
            areas: action.parameters.areas || ['all'],
            thresholds: action.parameters.thresholds || {},
            sensitivity: action.parameters.sensitivity || 'medium'
          }
        };
        
      case 'ACTIVATE_EMERGENCY_RESPONSE':
        return {
          type: 'activateEmergencyResponse',
          parameters: {
            scenario: action.parameters.scenario,
            severity: action.parameters.severity,
            location: action.parameters.location,
            resourceTypes: action.parameters.resourceTypes || ['all'],
            notificationGroups: action.parameters.notificationGroups || ['all'],
            autoEscalate: action.parameters.autoEscalate !== false
          }
        };
        
      case 'EXECUTE_RECOVERY_PLAN':
        return {
          type: 'executeRecoveryPlan',
          parameters: {
            disruptionId: action.parameters.disruptionId,
            planTemplate: action.parameters.planTemplate,
            priorityAreas: action.parameters.priorityAreas || [],
            timeframe: action.parameters.timeframe || 'immediate',
            resourceConstraints: action.parameters.resourceConstraints || {},
            monitoringFrequency: action.parameters.monitoringFrequency || 'high'
          }
        };
        
      case 'COORDINATE_MULTI_AGENCY_RESPONSE':
        return {
          type: 'coordinateMultiAgencyResponse',
          parameters: {
            incidentId: action.parameters.incidentId,
            agencies: action.parameters.agencies,
            coordinationLevel: action.parameters.coordinationLevel,
            communicationChannels: action.parameters.communicationChannels || ['all'],
            informationSharingProtocol: action.parameters.informationSharingProtocol || 'standard',
            commandStructure: action.parameters.commandStructure || 'unified'
          }
        };
        
      default:
        throw new Error(`Unsupported action type for Crisis domain: ${action.type}`);
    }
  }

  /**
   * Execute domain-specific action
   */
  async _executeDomainAction(domainAction) {
    logger.info(`Executing crisis domain action: ${domainAction.type}`);
    
    // For crisis actions, capture start time for all actions for response time tracking
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (domainAction.type) {
        case 'detectDisruptiveEvent':
          result = await this.disruptionManagementService.detectEvents(
            domainAction.parameters.eventTypes,
            domainAction.parameters.areas,
            {
              thresholds: domainAction.parameters.thresholds,
              sensitivity: domainAction.parameters.sensitivity
            }
          );
          
          // If events detected and alert service available, send alerts
          if (result.eventsDetected && result.eventsDetected.length > 0 && this.alertService) {
            await this.alertService.sendAlert('DISRUPTION_DETECTED', {
              eventCount: result.eventsDetected.length,
              highestSeverity: result.highestSeverity,
              timestamp: new Date().toISOString()
            });
          }
          
          break;
          
        case 'activateEmergencyResponse':
          result = await this.emergencyResponseService.activate(
            domainAction.parameters.scenario,
            domainAction.parameters.severity,
            domainAction.parameters.location,
            {
              resourceTypes: domainAction.parameters.resourceTypes,
              notificationGroups: domainAction.parameters.notificationGroups,
              autoEscalate: domainAction.parameters.autoEscalate
            }
          );
          
          // Always log emergency activation
          logger.warn(`EMERGENCY RESPONSE ACTIVATED: ${domainAction.parameters.scenario} (Severity: ${domainAction.parameters.severity})`);
          
          // Send alert if service available
          if (this.alertService) {
            await this.alertService.sendAlert('EMERGENCY_ACTIVATED', {
              scenario: domainAction.parameters.scenario,
              severity: domainAction.parameters.severity,
              location: domainAction.parameters.location,
              responseId: result.responseId,
              timestamp: new Date().toISOString()
            }, { priority: 'critical' });
          }
          
          break;
          
        case 'executeRecoveryPlan':
          result = await this.recoveryService.executePlan(
            domainAction.parameters.disruptionId,
            domainAction.parameters.planTemplate,
            {
              priorityAreas: domainAction.parameters.priorityAreas,
              timeframe: domainAction.parameters.timeframe,
              resourceConstraints: domainAction.parameters.resourceConstraints,
              monitoringFrequency: domainAction.parameters.monitoringFrequency
            }
          );
          
          break;
          
        case 'coordinateMultiAgencyResponse':
          result = await this.emergencyResponseService.coordinateAgencies(
            domainAction.parameters.incidentId,
            domainAction.parameters.agencies,
            domainAction.parameters.coordinationLevel,
            {
              communicationChannels: domainAction.parameters.communicationChannels,
              informationSharingProtocol: domainAction.parameters.informationSharingProtocol,
              commandStructure: domainAction.parameters.commandStructure
            }
          );
          
          break;
          
        default:
          throw new Error(`Unsupported domain action type: ${domainAction.type}`);
      }
      
      // Calculate response time for this action
      const responseTime = Date.now() - startTime;
      
      // For crisis actions, always add response time to result
      if (result) {
        result.responseTime = responseTime;
      }
      
      return result;
    } catch (error) {
      // For crisis domain, enhanced error handling with alert
      logger.error(`Critical error in crisis domain action ${domainAction.type}: ${error.message}`);
      
      // Send alert about failed crisis action if alert service available
      if (this.alertService) {
        await this.alertService.sendAlert('CRISIS_ACTION_FAILED', {
          actionType: domainAction.type,
          error: error.message,
          timestamp: new Date().toISOString()
        }, { priority: 'high' });
      }
      
      // Rethrow the original error
      throw error;
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
      domainResult: result,
      timestamp: new Date().toISOString()
    };
    
    // Add domain-specific metrics if available
    if (result.metrics) {
      standardResult.metrics = result.metrics;
    }
    
    // Add domain-specific impact if available
    if (result.impact) {
      standardResult.impact = result.impact;
    }
    
    // Add response time if available
    if (result.responseTime) {
      standardResult.responseTime = result.responseTime;
    }
    
    // Add escalation level if available
    if (result.escalationLevel) {
      standardResult.escalationLevel = result.escalationLevel;
    }
    
    // Add crisis-specific fields
    if (result.responseId) {
      standardResult.responseId = result.responseId;
    }
    
    if (result.eventsDetected) {
      standardResult.eventsDetected = result.eventsDetected;
      standardResult.eventCount = result.eventsDetected.length;
    }
    
    if (result.resourcesDeployed) {
      standardResult.resourcesDeployed = result.resourcesDeployed;
    }
    
    if (result.estimatedRecoveryTime) {
      standardResult.estimatedRecoveryTime = result.estimatedRecoveryTime;
    }
    
    return standardResult;
  }

  /**
   * Get domain-specific state
   */
  async _getDomainState() {
    try {
      // For crisis domain, try to use cache first if available
      if (this.cacheService) {
        const cachedState = await this.cacheService.get('crisis_domain_state');
        if (cachedState && (Date.now() - cachedState.timestamp < 10000)) { // Use cache if less than 10 seconds old
          return cachedState;
        }
      }
      
      // Get current crisis state from services
      const disruptionStatus = await this.disruptionManagementService.getCurrentStatus();
      const emergencyStatus = await this.emergencyResponseService.getCurrentStatus();
      const recoveryStatus = await this.recoveryService.getCurrentStatus();
      
      // Derive overall crisis level
      const activeDisruptions = disruptionStatus.activeDisruptions || [];
      const activeEmergencies = emergencyStatus.activeEmergencies || [];
      
      let crisisLevel = 'normal';
      if (activeDisruptions.length > 0) {
        crisisLevel = 'elevated';
      }
      if (activeEmergencies.length > 0) {
        crisisLevel = 'critical';
      }
      
      // Compile complete state
      const state = {
        timestamp: new Date().toISOString(),
        crisisLevel,
        disruptionStatus,
        emergencyStatus,
        recoveryStatus,
        serviceStatus: {
          disruptionManagementService: true,
          emergencyResponseService: true,
          recoveryService: true,
          alertService: !!this.alertService
        }
      };
      
      // Cache the state if caching is available
      if (this.cacheService) {
        await this.cacheService.set('crisis_domain_state', state);
      }
      
      return state;
    } catch (error) {
      logger.error(`Error getting crisis domain state: ${error.message}`);
      
      // Return partial state with service status
      return {
        timestamp: new Date().toISOString(),
        crisisLevel: 'unknown',
        serviceStatus: {
          disruptionManagementService: error.source !== 'disruptionManagementService',
          emergencyResponseService: error.source !== 'emergencyResponseService',
          recoveryService: error.source !== 'recoveryService',
          alertService: error.source !== 'alertService' && !!this.alertService
        },
        error: error.message
      };
    }
  }

  /**
   * Calculate domain-specific impact
   */
  _calculateDomainImpact(action, state) {
    // Calculate the impact of this action on crisis domain
    switch (action.type) {
      case 'DETECT_DISRUPTIVE_EVENT':
        return {
          crisisImpact: {
            safetyChange: 'improve',
            operationalChange: 'slight_improve',
            resourceUtilization: 'low',
            passengerExperience: 'neutral',
            score: 0.4 // 0-1 score representing overall crisis impact
          }
        };
        
      case 'ACTIVATE_EMERGENCY_RESPONSE':
        // Impact varies by severity
        const severity = action.parameters.severity || 'medium';
        let score = 0.7; // Default for medium severity
        
        if (severity === 'high' || severity === 'critical') {
          score = 0.9;
        } else if (severity === 'low') {
          score = 0.5;
        }
        
        return {
          crisisImpact: {
            safetyChange: 'significant_improve',
            operationalChange: 'significant_disruption',
            resourceUtilization: 'very_high',
            passengerExperience: 'negative_short_term_positive_long_term',
            score
          }
        };
        
      case 'EXECUTE_RECOVERY_PLAN':
        return {
          crisisImpact: {
            safetyChange: 'maintain',
            operationalChange: 'restore',
            resourceUtilization: 'high',
            passengerExperience: 'improve',
            score: 0.8
          }
        };
        
      case 'COORDINATE_MULTI_AGENCY_RESPONSE':
        return {
          crisisImpact: {
            safetyChange: 'significant_improve',
            operationalChange: 'complex',
            resourceUtilization: 'very_high',
            passengerExperience: 'variable',
            score: 0.85
          }
        };
        
      default:
        return {
          crisisImpact: {
            safetyChange: 'unknown',
            operationalChange: 'unknown',
            resourceUtilization: 'unknown',
            passengerExperience: 'unknown',
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
    if (!state || !state.disruptionStatus) {
      return []; // No constraints if state is incomplete
    }
    
    const constraints = [];
    
    // Add constraint for maximum response time
    constraints.push({
      type: 'MAX_RESPONSE_TIME',
      value: 60, // 60 seconds maximum response time
      description: 'Maximum time to respond to critical events'
    });
    
    // Add constraint for resource allocation limits
    constraints.push({
      type: 'RESOURCE_ALLOCATION_LIMIT',
      value: 0.8, // 80% of available resources
      description: 'Maximum proportion of resources that can be allocated to a single incident'
    });
    
    // Add constraint for escalation authorization
    constraints.push({
      type: 'ESCALATION_AUTHORIZATION',
      value: 'auto_until_level_3',
      description: 'Automatic escalation allowed until level 3, then requires authorization'
    });
    
    // Add constraints based on current state
    if (state.crisisLevel === 'critical') {
      constraints.push({
        type: 'CRITICAL_CRISIS_MODE',
        value: true,
        description: 'System is in critical crisis mode - special authorization rules apply'
      });
    }
    
    // Add constraints on multi-agency coordination
    if (state.emergencyStatus && state.emergencyStatus.externalAgenciesInvolved) {
      constraints.push({
        type: 'MULTI_AGENCY_PROTOCOLS',
        value: state.emergencyStatus.agencyProtocols || {},
        description: 'Protocols for multi-agency coordination that must be followed'
      });
    }
    
    return constraints;
  }

  /**
   * Validate action against constraints
   */
  _validateActionAgainstConstraints(action, constraints, state) {
    // Crisis domain actions have special validation logic due to critical nature
    if (!constraints || constraints.length === 0) {
      return { valid: true };
    }
    
    // Check each constraint
    for (const constraint of constraints) {
      if (constraint.type === 'ESCALATION_AUTHORIZATION') {
        // For emergency activation, check escalation authorization
        if (action.type === 'ACTIVATE_EMERGENCY_RESPONSE') {
          const severity = action.parameters.severity;
          
          // Level 4 or higher requires authorization and can't be autonomous
          if (severity === 'critical' && constraint.value === 'auto_until_level_3') {
            return {
              valid: false,
              error: 'Critical emergency activation requires human authorization',
              constraint
            };
          }
        }
      }
      
      if (constraint.type === 'MULTI_AGENCY_PROTOCOLS') {
        // For multi-agency coordination, check protocol compliance
        if (action.type === 'COORDINATE_MULTI_AGENCY_RESPONSE') {
          const agencies = action.parameters.agencies || [];
          const requiredProtocols = constraint.value || {};
          
          // Check if any specified agency is missing required protocols
          for (const agency of agencies) {
            if (requiredProtocols[agency] && 
                (!action.parameters.informationSharingProtocol || 
                 action.parameters.informationSharingProtocol !== requiredProtocols[agency])) {
              return {
                valid: false,
                error: `Agency ${agency} requires specific protocol: ${requiredProtocols[agency]}`,
                constraint
              };
            }
          }
        }
      }
      
      if (constraint.type === 'CRITICAL_CRISIS_MODE') {
        // In critical crisis mode, non-crisis actions require special handling
        if (action.type === 'DETECT_DISRUPTIVE_EVENT') {
          return {
            valid: true,
            warnings: [{
              type: 'REDUNDANT_IN_CRISIS_MODE',
              message: 'System already in critical crisis mode - detection may be redundant',
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
      // Get metrics from the crisis services
      const disruptionMetrics = await this.disruptionManagementService.getMetrics();
      const emergencyMetrics = await this.emergencyResponseService.getPerformanceMetrics();
      const recoveryMetrics = await this.recoveryService.getEffectivenessMetrics();
      
      return {
        activeDisruptions: disruptionMetrics.activeCount || 0,
        disruptionsByType: disruptionMetrics.byType || {},
        averageDetectionTime: disruptionMetrics.avgDetectionTime || 0,
        activeEmergencies: emergencyMetrics.activeCount || 0,
        averageResponseTime: emergencyMetrics.avgResponseTime || 0,
        resourceUtilization: emergencyMetrics.resourceUtilization || 0,
        recoveryEffectiveness: recoveryMetrics.effectiveness || 0,
        averageRecoveryTime: recoveryMetrics.avgRecoveryTime || 0,
        multiAgencyCoordinations: emergencyMetrics.multiAgencyCount || 0,
        lastMetricsUpdate: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error getting crisis domain metrics: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Get domain-specific dependencies for an action
   */
  _getDomainDependencies(action) {
    // Check for interdependencies between crisis actions
    switch (action.type) {
      case 'ACTIVATE_EMERGENCY_RESPONSE':
        // Emergency activation might depend on disruption detection
        return [{
          actionType: 'DETECT_DISRUPTIVE_EVENT',
          required: true,
          rationale: 'Emergency activation should follow disruption detection'
        }];
        
      case 'EXECUTE_RECOVERY_PLAN':
        // Recovery plan execution depends on emergency response
        return [{
          actionType: 'ACTIVATE_EMERGENCY_RESPONSE',
          required: true,
          rationale: 'Recovery should begin after emergency response is activated'
        }];
        
      case 'COORDINATE_MULTI_AGENCY_RESPONSE':
        // Multi-agency coordination depends on emergency activation
        return [{
          actionType: 'ACTIVATE_EMERGENCY_RESPONSE',
          required: true,
          rationale: 'Multi-agency coordination requires active emergency response'
        }];
        
      default:
        return [];
    }
  }
  
  /**
   * Get domain-specific timing constraints for an action
   */
  _getDomainTimingConstraints(action) {
    switch (action.type) {
      case 'DETECT_DISRUPTIVE_EVENT':
        return {
          estimated_duration_ms: 10000, // 10 seconds
          max_duration_ms: 30000, // 30 seconds
          priority: 'high'
        };
        
      case 'ACTIVATE_EMERGENCY_RESPONSE':
        return {
          estimated_duration_ms: 15000, // 15 seconds
          max_duration_ms: 45000, // 45 seconds
          priority: 'critical'
        };
        
      case 'EXECUTE_RECOVERY_PLAN':
        return {
          estimated_duration_ms: 30000, // 30 seconds
          max_duration_ms: 120000, // 2 minutes
          priority: 'high'
        };
        
      case 'COORDINATE_MULTI_AGENCY_RESPONSE':
        return {
          estimated_duration_ms: 25000, // 25 seconds
          max_duration_ms: 60000, // 1 minute
          priority: 'critical'
        };
        
      default:
        return {
          estimated_duration_ms: 20000, // 20 seconds (default)
          max_duration_ms: 60000, // 1 minute (default)
          priority: 'high' // Crisis actions default to high priority
        };
    }
  }
  
  /**
   * Handle domain-specific failure
   */
  _handleDomainFailure(action, error) {
    // Crisis domain failures are especially critical and require special handling
    logger.error(`CRISIS ACTION FAILURE: ${action.type} - ${error.message}`);
    
    // Send alert about failure regardless of action type
    if (this.alertService) {
      this.alertService.sendAlert('CRISIS_ACTION_FAILURE', {
        actionType: action.type,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { priority: 'critical' });
    }
    
    switch (action.type) {
      case 'DETECT_DISRUPTIVE_EVENT':
        // Detection failures should fallback to manual detection
        return { 
          type: 'ESCALATE_TO_HUMAN', 
          reason: 'Critical failure in disruption detection - escalating to human operators',
          urgency: 'high'
        };
        
      case 'ACTIVATE_EMERGENCY_RESPONSE':
        // Emergency activation failures require immediate human intervention
        return { 
          type: 'ESCALATE_TO_HUMAN', 
          reason: 'CRITICAL: Emergency activation failed - immediate human intervention required',
          urgency: 'critical'
        };
        
      case 'EXECUTE_RECOVERY_PLAN':
        // Recovery failures may retry with simpler plan
        if (error.message.includes('resources unavailable') || error.message.includes('complexity')) {
          return { 
            type: 'RETRY', 
            reason: 'Recovery plan execution failed - retrying with simplified plan',
            modifiedAction: {
              ...action,
              parameters: {
                ...action.parameters,
                planTemplate: 'simplified',
                priorityAreas: action.parameters.priorityAreas ? 
                  action.parameters.priorityAreas.slice(0, 1) : []
              }
            }
          };
        } else {
          return { 
            type: 'ESCALATE_TO_HUMAN', 
            reason: 'Recovery plan execution failed - escalating to human operators',
            urgency: 'high'
          };
        }
        
      case 'COORDINATE_MULTI_AGENCY_RESPONSE':
        // Multi-agency coordination failures always escalate to humans
        return { 
          type: 'ESCALATE_TO_HUMAN', 
          reason: 'Multi-agency coordination failed - immediate human intervention required',
          urgency: 'critical'
        };
        
      default:
        // Any unhandled crisis action failure escalates to humans
        return { 
          type: 'ESCALATE_TO_HUMAN', 
          reason: `Unhandled crisis action failure: ${action.type} - ${error.message}`,
          urgency: 'high'
        };
    }
  }

  /**
   * Check connectivity to required services
   */
  async _checkServicesConnectivity() {
    // Check disruption management service
    try {
      await this.disruptionManagementService.healthCheck();
    } catch (error) {
      throw new Error(`Disruption Management Service connectivity issue: ${error.message}`);
    }
    
    // Check emergency response service
    try {
      await this.emergencyResponseService.healthCheck();
    } catch (error) {
      throw new Error(`Emergency Response Service connectivity issue: ${error.message}`);
    }
    
    // Check recovery service
    try {
      await this.recoveryService.healthCheck();
    } catch (error) {
      throw new Error(`Recovery Service connectivity issue: ${error.message}`);
    }
    
    // Check alert service if available
    if (this.alertService) {
      try {
        await this.alertService.healthCheck();
      } catch (error) {
        logger.warn(`Alert Service connectivity issue: ${error.message} - critical alerts may not be delivered`);
        // Don't throw here, as the service is optional, but it's a significant issue
      }
    }
  }
}

module.exports = CrisisDomainAdapter;