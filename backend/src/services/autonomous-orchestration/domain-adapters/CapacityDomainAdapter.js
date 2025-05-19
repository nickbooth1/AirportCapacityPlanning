/**
 * Capacity Domain Adapter
 * 
 * Adapter for the Capacity domain, connecting the autonomous orchestration
 * engine to the stand capacity planning and allocation services.
 */

const BaseDomainAdapter = require('./BaseDomainAdapter');
const logger = require('../../../utils/logger');

class CapacityDomainAdapter extends BaseDomainAdapter {
  constructor(options = {}) {
    super({
      ...options,
      domainName: 'CAPACITY'
    });
    
    // Domain-specific services
    this.standCapacityService = options.standCapacityService;
    this.standCapacityToolService = options.standCapacityToolService;
    
    // Additional components
    this.cacheService = options.cacheService;
  }

  /**
   * Domain-specific initialization
   */
  async _initializeDomain() {
    if (!this.standCapacityService) {
      throw new Error('Stand Capacity Service is required for Capacity Domain Adapter');
    }
    
    if (!this.standCapacityToolService) {
      throw new Error('Stand Capacity Tool Service is required for Capacity Domain Adapter');
    }
    
    // Initialize domain cache if available
    if (this.cacheService) {
      await this.cacheService.initializeCache('capacity_domain');
    }
    
    // Check connectivity to required services
    await this._checkServicesConnectivity();
    
    logger.info('Capacity Domain Adapter successfully initialized domain services');
  }

  /**
   * Map generic action to domain-specific format
   */
  _mapToDomainAction(action) {
    // Convert general orchestration action to capacity-specific action
    switch (action.type) {
      case 'ALLOCATE_STANDS':
        return {
          type: 'allocateStands',
          parameters: {
            flightScheduleId: action.parameters.flightScheduleId,
            configurationId: action.parameters.configurationId,
            options: {
              optimizationStrategy: action.parameters.optimizationStrategy || 'balanced',
              includeAdjacencyRules: action.parameters.includeAdjacencyRules !== false,
              priorityAirlines: action.parameters.priorityAirlines || []
            }
          }
        };
        
      case 'ANALYZE_CAPACITY_IMPACT':
        return {
          type: 'analyzeCapacityImpact',
          parameters: {
            scenarioId: action.parameters.scenarioId,
            baselineId: action.parameters.baselineId,
            timeRange: action.parameters.timeRange,
            includeAdjacency: action.parameters.includeAdjacency !== false,
            detailedAnalysis: action.parameters.detailedAnalysis || false
          }
        };
        
      case 'OPTIMIZE_STAND_UTILIZATION':
        return {
          type: 'optimizeStandUtilization',
          parameters: {
            standIds: action.parameters.standIds,
            timeSlotIds: action.parameters.timeSlotIds,
            targetUtilization: action.parameters.targetUtilization,
            constraints: action.parameters.constraints || {}
          }
        };
        
      case 'UPDATE_CAPACITY_CONFIGURATION':
        return {
          type: 'updateCapacityConfiguration',
          parameters: {
            configurationId: action.parameters.configurationId,
            updates: action.parameters.updates
          }
        };
        
      default:
        throw new Error(`Unsupported action type for Capacity domain: ${action.type}`);
    }
  }

  /**
   * Execute domain-specific action
   */
  async _executeDomainAction(domainAction) {
    logger.info(`Executing capacity domain action: ${domainAction.type}`);
    
    switch (domainAction.type) {
      case 'allocateStands':
        return this.standCapacityService.allocateStands(
          domainAction.parameters.flightScheduleId,
          domainAction.parameters.configurationId,
          domainAction.parameters.options
        );
        
      case 'analyzeCapacityImpact':
        return this.standCapacityToolService.analyzeCapacityImpact(
          domainAction.parameters.scenarioId,
          domainAction.parameters.baselineId,
          domainAction.parameters.timeRange,
          {
            includeAdjacency: domainAction.parameters.includeAdjacency,
            detailedAnalysis: domainAction.parameters.detailedAnalysis
          }
        );
        
      case 'optimizeStandUtilization':
        return this.standCapacityService.optimizeUtilization(
          domainAction.parameters.standIds,
          domainAction.parameters.timeSlotIds,
          domainAction.parameters.targetUtilization,
          domainAction.parameters.constraints
        );
        
      case 'updateCapacityConfiguration':
        return this.standCapacityToolService.updateConfiguration(
          domainAction.parameters.configurationId,
          domainAction.parameters.updates
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
    
    return standardResult;
  }

  /**
   * Get domain-specific state
   */
  async _getDomainState() {
    try {
      // Get current capacity state from service
      const capacityState = await this.standCapacityService.getCurrentState();
      
      // Get additional metrics from the tool service
      const utilizationMetrics = await this.standCapacityToolService.getUtilizationMetrics();
      
      // Combine into complete domain state
      return {
        timestamp: new Date().toISOString(),
        capacityState,
        utilizationMetrics,
        serviceStatus: {
          standCapacityService: true,
          standCapacityToolService: true
        }
      };
    } catch (error) {
      logger.error(`Error getting capacity domain state: ${error.message}`);
      
      // Return partial state with service status
      return {
        timestamp: new Date().toISOString(),
        serviceStatus: {
          standCapacityService: error.source !== 'standCapacityService',
          standCapacityToolService: error.source !== 'standCapacityToolService'
        },
        error: error.message
      };
    }
  }

  /**
   * Calculate domain-specific impact
   */
  _calculateDomainImpact(action, state) {
    // Calculate the impact of this action on capacity domain
    switch (action.type) {
      case 'ALLOCATE_STANDS':
        return {
          capacityImpact: {
            standUtilizationChange: 'high',
            resourceEfficiency: 'medium',
            operationalComplexity: 'medium',
            score: 0.8 // 0-1 score representing overall capacity impact
          }
        };
        
      case 'ANALYZE_CAPACITY_IMPACT':
        return {
          capacityImpact: {
            standUtilizationChange: 'none',
            resourceEfficiency: 'none',
            operationalComplexity: 'low',
            score: 0.2 // 0-1 score representing overall capacity impact
          }
        };
        
      case 'OPTIMIZE_STAND_UTILIZATION':
        return {
          capacityImpact: {
            standUtilizationChange: 'high',
            resourceEfficiency: 'high',
            operationalComplexity: 'medium',
            score: 0.9 // 0-1 score representing overall capacity impact
          }
        };
        
      case 'UPDATE_CAPACITY_CONFIGURATION':
        return {
          capacityImpact: {
            standUtilizationChange: 'medium',
            resourceEfficiency: 'medium',
            operationalComplexity: 'low',
            score: 0.6 // 0-1 score representing overall capacity impact
          }
        };
        
      default:
        return {
          capacityImpact: {
            standUtilizationChange: 'unknown',
            resourceEfficiency: 'unknown',
            operationalComplexity: 'unknown',
            score: 0.5 // 0-1 score representing overall capacity impact
          }
        };
    }
  }

  /**
   * Get domain-specific constraints
   */
  _getDomainConstraints(state) {
    // Get current constraints from domain state
    if (!state || !state.capacityState) {
      return []; // No constraints if state is incomplete
    }
    
    const constraints = [];
    
    // Add constraint for maximum allowed stand utilization
    constraints.push({
      type: 'MAX_STAND_UTILIZATION',
      value: 0.95, // 95% max utilization
      description: 'Maximum allowed stand utilization to maintain operational buffer'
    });
    
    // Add constraint for minimum adjacency spacing
    constraints.push({
      type: 'MIN_ADJACENCY_COMPLIANCE',
      value: 0.9, // 90% compliance with adjacency rules
      description: 'Minimum compliance with stand adjacency rules'
    });
    
    // Add constraints based on current state
    if (state.capacityState.maintenanceInfo && state.capacityState.maintenanceInfo.activeMaintenanceCount > 0) {
      constraints.push({
        type: 'MAINTENANCE_ACTIVE',
        value: state.capacityState.maintenanceInfo.activeMaintenanceCount,
        affectedStands: state.capacityState.maintenanceInfo.affectedStandIds || [],
        description: 'Active maintenance reducing available capacity'
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
      if (constraint.type === 'MAINTENANCE_ACTIVE') {
        // For stand allocation with maintenance active, check if affected stands are used
        if (action.type === 'ALLOCATE_STANDS' && 
            constraint.affectedStands && 
            constraint.affectedStands.length > 0) {
          
          // In a real implementation, we would check if the allocation plan
          // uses any of the affected stands, but for this example we'll just
          // include a warning but allow the action
          return {
            valid: true,
            warnings: [{
              type: 'MAINTENANCE_CONFLICT_POSSIBLE',
              message: `Action may conflict with ${constraint.value} active maintenance operations`,
              affectedStands: constraint.affectedStands
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
      // Get metrics from the capacity services
      const capacityMetrics = await this.standCapacityService.getMetrics();
      const toolMetrics = await this.standCapacityToolService.getPerformanceMetrics();
      
      return {
        standUtilization: capacityMetrics.averageUtilization || 0,
        standAllocationSuccessRate: capacityMetrics.allocationSuccessRate || 0,
        capacityToolResponseTime: toolMetrics.averageResponseTime || 0,
        optimizationQuality: toolMetrics.optimizationQuality || 0,
        lastCalculationTimestamp: capacityMetrics.lastCalculationTimestamp
      };
    } catch (error) {
      logger.error(`Error getting capacity domain metrics: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Get domain-specific dependencies for an action
   */
  _getDomainDependencies(action) {
    // Default implementation: no domain-specific dependencies
    return [];
  }
  
  /**
   * Get domain-specific timing constraints for an action
   */
  _getDomainTimingConstraints(action) {
    switch (action.type) {
      case 'ALLOCATE_STANDS':
        return {
          estimated_duration_ms: 15000, // 15 seconds
          max_duration_ms: 60000, // 1 minute
          priority: 'high'
        };
        
      case 'ANALYZE_CAPACITY_IMPACT':
        return {
          estimated_duration_ms: 10000, // 10 seconds
          max_duration_ms: 30000, // 30 seconds
          priority: 'medium'
        };
        
      case 'OPTIMIZE_STAND_UTILIZATION':
        return {
          estimated_duration_ms: 20000, // 20 seconds
          max_duration_ms: 120000, // 2 minutes
          priority: 'high'
        };
        
      case 'UPDATE_CAPACITY_CONFIGURATION':
        return {
          estimated_duration_ms: 5000, // 5 seconds
          max_duration_ms: 15000, // 15 seconds
          priority: 'medium'
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
    // Handle capacity domain specific failures
    switch (action.type) {
      case 'ALLOCATE_STANDS':
        // For allocation failures, we might want to retry with different parameters
        if (error.message.includes('optimization timeout')) {
          return { 
            type: 'RETRY', 
            reason: 'Allocation optimization timeout - retrying with simplified parameters',
            modifiedAction: {
              ...action,
              parameters: {
                ...action.parameters,
                optimizationStrategy: 'fast'
              }
            }
          };
        } else if (error.message.includes('insufficient capacity')) {
          return { 
            type: 'ABORT_PLAN', 
            reason: 'Insufficient capacity for allocation - user intervention required'
          };
        }
        break;
        
      case 'ANALYZE_CAPACITY_IMPACT':
        // For analysis failures, we might skip and continue with the plan
        return { 
          type: 'SKIP', 
          reason: 'Analysis failed but not critical to plan execution'
        };
        
      case 'OPTIMIZE_STAND_UTILIZATION':
        // For optimization failures, we might want to retry with smaller scope
        if (error.message.includes('optimization complexity')) {
          // If too many stands were included, try with a subset
          if (action.parameters.standIds && action.parameters.standIds.length > 10) {
            const reducedStandIds = action.parameters.standIds.slice(0, 10);
            return { 
              type: 'RETRY', 
              reason: 'Optimization too complex - retrying with reduced scope',
              modifiedAction: {
                ...action,
                parameters: {
                  ...action.parameters,
                  standIds: reducedStandIds
                }
              }
            };
          }
        }
        break;
    }
    
    // Default handling: abort the plan
    return { type: 'ABORT_PLAN', reason: error.message };
  }

  /**
   * Check connectivity to required services
   */
  async _checkServicesConnectivity() {
    // Check stand capacity service
    try {
      await this.standCapacityService.healthCheck();
    } catch (error) {
      throw new Error(`Stand Capacity Service connectivity issue: ${error.message}`);
    }
    
    // Check stand capacity tool service
    try {
      await this.standCapacityToolService.healthCheck();
    } catch (error) {
      throw new Error(`Stand Capacity Tool Service connectivity issue: ${error.message}`);
    }
  }
}

module.exports = CapacityDomainAdapter;