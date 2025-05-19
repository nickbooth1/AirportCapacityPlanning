/**
 * Commercial Domain Adapter
 * 
 * Adapter for the Commercial domain, connecting the autonomous orchestration
 * engine to the retail, revenue management, and concession services.
 */

const BaseDomainAdapter = require('./BaseDomainAdapter');
const logger = require('../../../utils/logger');

class CommercialDomainAdapter extends BaseDomainAdapter {
  constructor(options = {}) {
    super({
      ...options,
      domainName: 'COMMERCIAL'
    });
    
    // Domain-specific services
    this.revenueManagementService = options.revenueManagementService;
    this.retailAnalyticsService = options.retailAnalyticsService;
    this.concessionService = options.concessionService;
    
    // Additional components
    this.cacheService = options.cacheService;
  }

  /**
   * Domain-specific initialization
   */
  async _initializeDomain() {
    if (!this.revenueManagementService) {
      throw new Error('Revenue Management Service is required for Commercial Domain Adapter');
    }
    
    if (!this.retailAnalyticsService) {
      throw new Error('Retail Analytics Service is required for Commercial Domain Adapter');
    }
    
    // Concession Service is optional
    if (this.concessionService) {
      logger.info('Concession Service is available');
    } else {
      logger.warn('Concession Service is not available, concession-related actions will be limited');
    }
    
    // Initialize domain cache if available
    if (this.cacheService) {
      await this.cacheService.initializeCache('commercial_domain');
    }
    
    // Check connectivity to required services
    await this._checkServicesConnectivity();
    
    logger.info('Commercial Domain Adapter successfully initialized domain services');
  }

  /**
   * Map generic action to domain-specific format
   */
  _mapToDomainAction(action) {
    // Convert general orchestration action to commercial-specific action
    switch (action.type) {
      case 'OPTIMIZE_RETAIL_STAFFING':
        return {
          type: 'optimizeRetailStaffing',
          parameters: {
            locations: action.parameters.locations,
            timeRange: action.parameters.timeRange,
            passengerForecast: action.parameters.passengerForecast,
            staffingRules: action.parameters.staffingRules || {},
            minimumServiceLevel: action.parameters.minimumServiceLevel || 0.8
          }
        };
        
      case 'ADJUST_PRICING_STRATEGY':
        return {
          type: 'adjustPricingStrategy',
          parameters: {
            productCategories: action.parameters.productCategories,
            locationIds: action.parameters.locationIds,
            adjustmentType: action.parameters.adjustmentType,
            targetMetric: action.parameters.targetMetric || 'revenue',
            marketingContext: action.parameters.marketingContext || {},
            constraints: action.parameters.constraints || {}
          }
        };
        
      case 'ANALYZE_COMMERCIAL_PERFORMANCE':
        return {
          type: 'analyzeCommercialPerformance',
          parameters: {
            metrics: action.parameters.metrics || ['revenue', 'conversion', 'footfall', 'dwell_time'],
            locations: action.parameters.locations,
            timeRange: action.parameters.timeRange,
            compareWithBaseline: action.parameters.compareWithBaseline || false,
            baselineTimeRange: action.parameters.baselineTimeRange,
            segmentation: action.parameters.segmentation || {}
          }
        };
        
      case 'MANAGE_CONCESSION_ALLOCATION':
        return {
          type: 'manageConcessionAllocation',
          parameters: {
            spaceId: action.parameters.spaceId,
            strategy: action.parameters.strategy,
            targetRevenue: action.parameters.targetRevenue,
            constraints: action.parameters.constraints || {},
            operationalCriteria: action.parameters.operationalCriteria || {}
          }
        };
        
      default:
        throw new Error(`Unsupported action type for Commercial domain: ${action.type}`);
    }
  }

  /**
   * Execute domain-specific action
   */
  async _executeDomainAction(domainAction) {
    logger.info(`Executing commercial domain action: ${domainAction.type}`);
    
    switch (domainAction.type) {
      case 'optimizeRetailStaffing':
        return this.revenueManagementService.optimizeStaffing(
          domainAction.parameters.locations,
          domainAction.parameters.timeRange,
          domainAction.parameters.passengerForecast,
          {
            staffingRules: domainAction.parameters.staffingRules,
            minimumServiceLevel: domainAction.parameters.minimumServiceLevel
          }
        );
        
      case 'adjustPricingStrategy':
        return this.revenueManagementService.adjustPricing(
          domainAction.parameters.productCategories,
          domainAction.parameters.locationIds,
          domainAction.parameters.adjustmentType,
          {
            targetMetric: domainAction.parameters.targetMetric,
            marketingContext: domainAction.parameters.marketingContext,
            constraints: domainAction.parameters.constraints
          }
        );
        
      case 'analyzeCommercialPerformance':
        return this.retailAnalyticsService.analyzePerformance(
          domainAction.parameters.metrics,
          domainAction.parameters.locations,
          domainAction.parameters.timeRange,
          {
            compareWithBaseline: domainAction.parameters.compareWithBaseline,
            baselineTimeRange: domainAction.parameters.baselineTimeRange,
            segmentation: domainAction.parameters.segmentation
          }
        );
        
      case 'manageConcessionAllocation':
        // Check if concession service is available
        if (!this.concessionService) {
          throw new Error('Concession Service not available');
        }
        
        return this.concessionService.allocateConcessions(
          domainAction.parameters.spaceId,
          domainAction.parameters.strategy,
          domainAction.parameters.targetRevenue,
          {
            constraints: domainAction.parameters.constraints,
            operationalCriteria: domainAction.parameters.operationalCriteria
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
    
    // Add revenue projections if available
    if (result.revenueProjections) {
      standardResult.revenueProjections = result.revenueProjections;
    }
    
    // Add staffing plan if available
    if (result.staffingPlan) {
      standardResult.staffingPlan = result.staffingPlan;
    }
    
    return standardResult;
  }

  /**
   * Get domain-specific state
   */
  async _getDomainState() {
    try {
      // Get current commercial state from services
      const revenueState = await this.revenueManagementService.getCurrentState();
      const retailMetrics = await this.retailAnalyticsService.getCurrentMetrics();
      
      // Get concession state if available
      let concessionState = { available: false };
      if (this.concessionService) {
        concessionState = await this.concessionService.getCurrentState();
        concessionState.available = true;
      }
      
      // Combine into complete domain state
      return {
        timestamp: new Date().toISOString(),
        revenueState,
        retailMetrics,
        concessionState,
        serviceStatus: {
          revenueManagementService: true,
          retailAnalyticsService: true,
          concessionService: !!this.concessionService
        }
      };
    } catch (error) {
      logger.error(`Error getting commercial domain state: ${error.message}`);
      
      // Return partial state with service status
      return {
        timestamp: new Date().toISOString(),
        serviceStatus: {
          revenueManagementService: error.source !== 'revenueManagementService',
          retailAnalyticsService: error.source !== 'retailAnalyticsService',
          concessionService: error.source !== 'concessionService' && !!this.concessionService
        },
        error: error.message
      };
    }
  }

  /**
   * Calculate domain-specific impact
   */
  _calculateDomainImpact(action, state) {
    // Calculate the impact of this action on commercial domain
    switch (action.type) {
      case 'OPTIMIZE_RETAIL_STAFFING':
        return {
          commercialImpact: {
            revenueChange: 'increase',
            customerSatisfactionChange: 'increase',
            operationalCostChange: 'optimize',
            resourceEfficiency: 'high',
            score: 0.8 // 0-1 score representing overall commercial impact
          }
        };
        
      case 'ADJUST_PRICING_STRATEGY':
        // Impact depends on the adjustment type
        const adjustmentType = action.parameters.adjustmentType;
        
        if (adjustmentType === 'dynamic_pricing') {
          return {
            commercialImpact: {
              revenueChange: 'increase',
              customerSatisfactionChange: 'neutral',
              operationalCostChange: 'none',
              resourceEfficiency: 'medium',
              score: 0.75
            }
          };
        } else if (adjustmentType === 'promotion') {
          return {
            commercialImpact: {
              revenueChange: 'short_term_decrease_long_term_increase',
              customerSatisfactionChange: 'increase',
              operationalCostChange: 'slight_increase',
              resourceEfficiency: 'medium',
              score: 0.7
            }
          };
        } else if (adjustmentType === 'seasonal_adjustment') {
          return {
            commercialImpact: {
              revenueChange: 'optimize',
              customerSatisfactionChange: 'neutral',
              operationalCostChange: 'none',
              resourceEfficiency: 'high',
              score: 0.8
            }
          };
        } else {
          return {
            commercialImpact: {
              revenueChange: 'variable',
              customerSatisfactionChange: 'variable',
              operationalCostChange: 'variable',
              resourceEfficiency: 'medium',
              score: 0.6
            }
          };
        }
        
      case 'ANALYZE_COMMERCIAL_PERFORMANCE':
        return {
          commercialImpact: {
            revenueChange: 'none',
            customerSatisfactionChange: 'none',
            operationalCostChange: 'slight_increase',
            resourceEfficiency: 'low',
            score: 0.2 // Analysis has minimal direct impact
          }
        };
        
      case 'MANAGE_CONCESSION_ALLOCATION':
        return {
          commercialImpact: {
            revenueChange: 'increase',
            customerSatisfactionChange: 'increase',
            operationalCostChange: 'initial_increase',
            resourceEfficiency: 'high',
            score: 0.85
          }
        };
        
      default:
        return {
          commercialImpact: {
            revenueChange: 'unknown',
            customerSatisfactionChange: 'unknown',
            operationalCostChange: 'unknown',
            resourceEfficiency: 'unknown',
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
    if (!state || !state.revenueState) {
      return []; // No constraints if state is incomplete
    }
    
    const constraints = [];
    
    // Add constraint for minimum revenue targets
    constraints.push({
      type: 'MIN_REVENUE_TARGET',
      value: state.revenueState.revenueTargets || { daily: 100000 },
      description: 'Minimum revenue targets that must be maintained'
    });
    
    // Add constraint for maximum pricing adjustments
    constraints.push({
      type: 'MAX_PRICE_ADJUSTMENT',
      value: 0.2, // 20% maximum price adjustment
      description: 'Maximum allowed price adjustment in a single action'
    });
    
    // Add constraint for minimum staffing levels
    constraints.push({
      type: 'MIN_STAFFING_LEVEL',
      value: 0.7, // 70% of optimal staffing
      description: 'Minimum staffing level as a proportion of optimal'
    });
    
    // Add constraints based on current state
    if (state.retailMetrics && state.retailMetrics.customerSatisfaction < 3.5) {
      constraints.push({
        type: 'CUSTOMER_SATISFACTION_THRESHOLD',
        value: 3.5,
        currentValue: state.retailMetrics.customerSatisfaction,
        description: 'Customer satisfaction below threshold - prioritize improvement'
      });
    }
    
    // Add contract constraints if concession data is available
    if (state.concessionState && state.concessionState.available) {
      constraints.push({
        type: 'CONCESSION_CONTRACT_CONSTRAINTS',
        value: state.concessionState.contractObligations || {},
        description: 'Contract obligations that must be respected for concessions'
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
      if (constraint.type === 'MAX_PRICE_ADJUSTMENT') {
        // For pricing adjustments, check if within limits
        if (action.type === 'ADJUST_PRICING_STRATEGY') {
          // In a real implementation, we would check the actual adjustment amount
          // but for this example we'll just include a warning
          return {
            valid: true,
            warnings: [{
              type: 'VERIFY_PRICE_ADJUSTMENT_LIMITS',
              message: `Ensure price adjustments do not exceed ${constraint.value * 100}% limit`,
              constraint
            }]
          };
        }
      }
      
      if (constraint.type === 'CUSTOMER_SATISFACTION_THRESHOLD') {
        // For actions that might affect customer satisfaction, flag if already below threshold
        if (action.type === 'ADJUST_PRICING_STRATEGY') {
          return {
            valid: true,
            warnings: [{
              type: 'CUSTOMER_SATISFACTION_AT_RISK',
              message: 'Customer satisfaction already below threshold - consider impact carefully',
              constraint
            }]
          };
        }
      }
      
      if (constraint.type === 'CONCESSION_CONTRACT_CONSTRAINTS') {
        // For concession management, check contract obligations
        if (action.type === 'MANAGE_CONCESSION_ALLOCATION') {
          return {
            valid: true,
            warnings: [{
              type: 'VERIFY_CONTRACT_COMPLIANCE',
              message: 'Ensure allocation changes comply with contract obligations',
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
      // Get metrics from the commercial services
      const revenueMetrics = await this.revenueManagementService.getPerformanceMetrics();
      const retailMetrics = await this.retailAnalyticsService.getDetailedMetrics();
      
      // Get concession metrics if available
      let concessionMetrics = {};
      if (this.concessionService) {
        concessionMetrics = await this.concessionService.getPerformanceMetrics();
      }
      
      return {
        totalRevenue: revenueMetrics.totalRevenue || 0,
        revenuePerPassenger: revenueMetrics.revenuePerPassenger || 0,
        retailConversionRate: retailMetrics.conversionRate || 0,
        avgTransactionValue: retailMetrics.avgTransactionValue || 0,
        footfall: retailMetrics.footfall || 0,
        dwellTime: retailMetrics.dwellTime || 0,
        customerSatisfaction: retailMetrics.customerSatisfaction || 0,
        concessionUtilization: concessionMetrics.spaceUtilization || 0,
        concessionYield: concessionMetrics.revenuePerSquareMeter || 0,
        lastMetricsUpdate: revenueMetrics.timestamp
      };
    } catch (error) {
      logger.error(`Error getting commercial domain metrics: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Get domain-specific dependencies for an action
   */
  _getDomainDependencies(action) {
    // Check for interdependencies between commercial actions
    switch (action.type) {
      case 'OPTIMIZE_RETAIL_STAFFING':
        // Staffing optimization might depend on performance analysis
        return [{
          actionType: 'ANALYZE_COMMERCIAL_PERFORMANCE',
          required: false,
          rationale: 'Staffing optimization is more effective with recent performance data'
        }];
        
      case 'ADJUST_PRICING_STRATEGY':
        // Pricing strategy adjustments should be informed by performance analysis
        return [{
          actionType: 'ANALYZE_COMMERCIAL_PERFORMANCE',
          required: true,
          rationale: 'Pricing adjustments require recent performance metrics'
        }];
        
      case 'MANAGE_CONCESSION_ALLOCATION':
        // Concession management depends on both analysis and revenue projections
        return [
          {
            actionType: 'ANALYZE_COMMERCIAL_PERFORMANCE',
            required: true,
            rationale: 'Concession allocation requires recent performance data'
          }
        ];
        
      default:
        return [];
    }
  }
  
  /**
   * Get domain-specific timing constraints for an action
   */
  _getDomainTimingConstraints(action) {
    switch (action.type) {
      case 'OPTIMIZE_RETAIL_STAFFING':
        return {
          estimated_duration_ms: 15000, // 15 seconds
          max_duration_ms: 45000, // 45 seconds
          priority: 'high'
        };
        
      case 'ADJUST_PRICING_STRATEGY':
        return {
          estimated_duration_ms: 20000, // 20 seconds
          max_duration_ms: 60000, // 1 minute
          priority: 'high'
        };
        
      case 'ANALYZE_COMMERCIAL_PERFORMANCE':
        return {
          estimated_duration_ms: 30000, // 30 seconds
          max_duration_ms: 90000, // 1.5 minutes
          priority: 'medium'
        };
        
      case 'MANAGE_CONCESSION_ALLOCATION':
        return {
          estimated_duration_ms: 25000, // 25 seconds
          max_duration_ms: 75000, // 1.25 minutes
          priority: 'medium'
        };
        
      default:
        return {
          estimated_duration_ms: 20000, // 20 seconds (default)
          max_duration_ms: 60000, // 1 minute (default)
          priority: 'medium'
        };
    }
  }
  
  /**
   * Handle domain-specific failure
   */
  _handleDomainFailure(action, error) {
    // Handle commercial domain specific failures
    switch (action.type) {
      case 'OPTIMIZE_RETAIL_STAFFING':
        // For staffing optimization failures, we might reduce scope
        if (error.message.includes('insufficient data') || error.message.includes('forecast missing')) {
          return { 
            type: 'RETRY', 
            reason: 'Insufficient data for staffing optimization - adding analysis first',
            modifiedAction: {
              type: 'ANALYZE_COMMERCIAL_PERFORMANCE',
              parameters: {
                metrics: ['footfall', 'conversion', 'dwell_time'],
                locations: action.parameters.locations,
                timeRange: action.parameters.timeRange
              }
            }
          };
        }
        break;
        
      case 'ADJUST_PRICING_STRATEGY':
        // For pricing failures, might need more targeted scope
        if (error.message.includes('range too broad')) {
          // If the product category range is too broad
          if (action.parameters.productCategories && action.parameters.productCategories.length > 3) {
            const reducedCategories = action.parameters.productCategories.slice(0, 3);
            return { 
              type: 'RETRY', 
              reason: 'Too many product categories - retrying with reduced scope',
              modifiedAction: {
                ...action,
                parameters: {
                  ...action.parameters,
                  productCategories: reducedCategories
                }
              }
            };
          }
        }
        break;
        
      case 'ANALYZE_COMMERCIAL_PERFORMANCE':
        // Analysis failures are not critical and can be skipped
        return { 
          type: 'SKIP', 
          reason: 'Performance analysis failed but not critical to plan execution'
        };
        
      case 'MANAGE_CONCESSION_ALLOCATION':
        // Concession allocation failures might need different strategy
        if (error.message.includes('target unrealistic')) {
          return { 
            type: 'RETRY', 
            reason: 'Revenue target unrealistic - retrying with balanced strategy',
            modifiedAction: {
              ...action,
              parameters: {
                ...action.parameters,
                strategy: 'balanced',
                targetRevenue: null // Let the system calculate a realistic target
              }
            }
          };
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
    // Check revenue management service
    try {
      await this.revenueManagementService.healthCheck();
    } catch (error) {
      throw new Error(`Revenue Management Service connectivity issue: ${error.message}`);
    }
    
    // Check retail analytics service
    try {
      await this.retailAnalyticsService.healthCheck();
    } catch (error) {
      throw new Error(`Retail Analytics Service connectivity issue: ${error.message}`);
    }
    
    // Check concession service if available
    if (this.concessionService) {
      try {
        await this.concessionService.healthCheck();
      } catch (error) {
        logger.warn(`Concession Service connectivity issue: ${error.message}`);
        // Don't throw here, as the service is optional
      }
    }
  }
}

module.exports = CommercialDomainAdapter;