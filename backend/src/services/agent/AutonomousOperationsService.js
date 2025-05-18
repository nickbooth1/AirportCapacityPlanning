/**
 * Autonomous Operations Service
 * 
 * This service enables the AirportAI to autonomously make and execute certain decisions
 * without human intervention, following configured policies and safety guardrails.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const standCapacityService = require('../standCapacityService');
const maintenanceRequestService = require('../maintenanceRequestService');
const flightDataService = require('../FlightDataService');

class AutonomousOperationsService {
  constructor() {
    this.policies = new Map();
    this.decisionQueue = [];
    this.decisionHistory = [];
    this.safetyChecks = [];
    this.executionHandlers = {};
    
    // Initialize safety checks
    this.initializeSafetyChecks();
    
    // Initialize execution handlers
    this.initializeExecutionHandlers();
    
    // Log service initialization
    logger.info('AutonomousOperationsService initialized');
  }
  
  /**
   * Initialize safety checks for autonomous decisions
   */
  initializeSafetyChecks() {
    // Add standard safety checks for all decisions
    this.safetyChecks.push({
      name: 'within_operating_hours',
      check: (decision) => {
        const policy = this.policies.get(decision.policyName);
        if (!policy) return { passed: false, reason: 'Policy not found' };
        
        if (!policy.activeHours) return { passed: true }; // No time restriction
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        
        const startParts = policy.activeHours.start.split(':');
        const endParts = policy.activeHours.end.split(':');
        const startTime = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        const endTime = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
        
        return { 
          passed: currentTime >= startTime && currentTime <= endTime,
          reason: 'Outside of active hours for this policy'
        };
      }
    });
    
    this.safetyChecks.push({
      name: 'within_impact_thresholds',
      check: (decision) => {
        const policy = this.policies.get(decision.policyName);
        if (!policy) return { passed: false, reason: 'Policy not found' };
        
        const thresholds = policy.thresholds || {};
        const impact = decision.impact || {};
        
        // Check each threshold
        for (const [key, maxValue] of Object.entries(thresholds)) {
          if (key === 'requiredConfidenceScore') {
            if ((decision.confidence || 0) < maxValue) {
              return { 
                passed: false, 
                reason: `Confidence score ${decision.confidence} below required threshold ${maxValue}`
              };
            }
          } else if (key === 'maxImpactedFlights' && impact.flightsAffected) {
            if (impact.flightsAffected > maxValue) {
              return { 
                passed: false, 
                reason: `Impact of ${impact.flightsAffected} flights exceeds threshold of ${maxValue}`
              };
            }
          } else if (key === 'maxCapacityReduction' && impact.capacityChange) {
            if (impact.capacityChange > maxValue) {
              return { 
                passed: false, 
                reason: `Capacity reduction of ${impact.capacityChange} exceeds threshold of ${maxValue}`
              };
            }
          }
        }
        
        return { passed: true };
      }
    });
    
    this.safetyChecks.push({
      name: 'resources_available',
      check: async (decision) => {
        // Check if necessary resources are available for the action
        // This is a placeholder and would need to be customized based on the decision type
        switch (decision.decisionType) {
          case 'stand_reallocation':
            // Verify proposed stands are actually available
            try {
              const standIds = decision.proposedAction.details.toStands;
              const availabilityCheck = await standCapacityService.checkStandsAvailability(
                standIds, 
                decision.timeWindow.start, 
                decision.timeWindow.end
              );
              
              if (!availabilityCheck.allAvailable) {
                return { 
                  passed: false, 
                  reason: `Proposed stands are not available: ${availabilityCheck.unavailableStands.join(', ')}`
                };
              }
            } catch (error) {
              logger.error(`Stand availability check failed: ${error.message}`);
              return { passed: false, reason: 'Failed to verify stand availability' };
            }
            break;
            
          // Add other decision types here
        }
        
        return { passed: true };
      }
    });
  }
  
  /**
   * Initialize execution handlers for different decision types
   */
  initializeExecutionHandlers() {
    this.executionHandlers['stand_reallocation'] = async (decision) => {
      try {
        const flights = decision.proposedAction.details.flights;
        const toStands = decision.proposedAction.details.toStands;
        const results = [];
        
        // Execute each flight reallocation
        for (let i = 0; i < flights.length; i++) {
          const flightId = flights[i];
          const standId = toStands[i];
          
          // Handle any overrides from approval
          if (decision.modifications && decision.modifications.flightOverrides && 
              decision.modifications.flightOverrides[flightId]) {
            standId = decision.modifications.flightOverrides[flightId];
          }
          
          // Update the flight allocation
          const result = await flightDataService.updateFlightStandAllocation(flightId, standId);
          results.push({
            flightId,
            standId,
            success: !!result,
            message: result ? 'Reallocated successfully' : 'Reallocation failed'
          });
        }
        
        return {
          success: results.every(r => r.success),
          details: results
        };
      } catch (error) {
        logger.error(`Stand reallocation execution error: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    };
    
    this.executionHandlers['maintenance_schedule_adjustment'] = async (decision) => {
      try {
        const maintenanceId = decision.proposedAction.details.maintenanceId;
        const newStartTime = decision.proposedAction.details.newStartTime;
        const newEndTime = decision.proposedAction.details.newEndTime;
        
        // Update the maintenance schedule
        const result = await maintenanceRequestService.updateMaintenanceSchedule(
          maintenanceId,
          { startTime: newStartTime, endTime: newEndTime }
        );
        
        return {
          success: !!result,
          details: {
            maintenanceId,
            originalTimes: {
              startTime: decision.proposedAction.details.originalStartTime,
              endTime: decision.proposedAction.details.originalEndTime
            },
            newTimes: {
              startTime: newStartTime,
              endTime: newEndTime
            }
          }
        };
      } catch (error) {
        logger.error(`Maintenance schedule adjustment error: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    };
    
    // Add other execution handlers for different decision types
  }
  
  /**
   * Register a new policy for autonomous decision making
   * @param {Object} policy - The policy configuration
   * @returns {Object} - The registered policy
   */
  async registerPolicy(policy) {
    try {
      // Validate policy structure
      if (!policy.policyName || !policy.decisionType) {
        throw new Error('Policy must include a name and decision type');
      }
      
      // Generate a policy ID if not provided
      const policyId = policy.policyId || uuidv4();
      const policyWithId = {
        ...policy,
        policyId,
        version: 1,
        status: policy.enabled ? 'active' : 'inactive',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Store the policy
      this.policies.set(policy.policyName, policyWithId);
      
      logger.info(`Policy registered: ${policy.policyName} (${policyId})`);
      return policyWithId;
    } catch (error) {
      logger.error(`Policy registration error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update an existing policy
   * @param {string} policyId - The ID of the policy to update
   * @param {Object} updates - The policy updates
   * @returns {Object} - The updated policy
   */
  async updatePolicy(policyId, updates) {
    try {
      // Find policy by ID
      let existingPolicy = null;
      let policyName = null;
      
      for (const [name, policy] of this.policies.entries()) {
        if (policy.policyId === policyId) {
          existingPolicy = policy;
          policyName = name;
          break;
        }
      }
      
      if (!existingPolicy) {
        throw new Error(`Policy with ID ${policyId} not found`);
      }
      
      // Create updated policy
      const updatedPolicy = {
        ...existingPolicy,
        ...updates,
        version: existingPolicy.version + 1,
        updatedAt: new Date().toISOString()
      };
      
      // Update status if enabled flag changed
      if (updates.hasOwnProperty('enabled')) {
        updatedPolicy.status = updates.enabled ? 'active' : 'inactive';
      }
      
      // Store the updated policy
      this.policies.set(policyName, updatedPolicy);
      
      logger.info(`Policy updated: ${policyName} (${policyId}), version ${updatedPolicy.version}`);
      return updatedPolicy;
    } catch (error) {
      logger.error(`Policy update error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get all policies
   * @param {Object} filters - Optional filters for policies
   * @returns {Array} - List of policies
   */
  async getPolicies(filters = {}) {
    try {
      let policies = Array.from(this.policies.values());
      
      // Apply filters if provided
      if (filters.status) {
        policies = policies.filter(p => p.status === filters.status);
      }
      
      if (filters.decisionType) {
        policies = policies.filter(p => p.decisionType === filters.decisionType);
      }
      
      return policies;
    } catch (error) {
      logger.error(`Get policies error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a new autonomous decision
   * @param {Object} decisionData - The decision data
   * @returns {Object} - The created decision
   */
  async createDecision(decisionData) {
    try {
      // Validate decision data
      if (!decisionData.decisionType || !decisionData.policyName) {
        throw new Error('Decision must include decision type and policy name');
      }
      
      const policy = this.policies.get(decisionData.policyName);
      if (!policy) {
        throw new Error(`Policy ${decisionData.policyName} not found`);
      }
      
      if (policy.status !== 'active') {
        throw new Error(`Policy ${decisionData.policyName} is not active`);
      }
      
      // Generate a decision ID
      const decisionId = uuidv4();
      
      // Create the decision object
      const decision = {
        ...decisionData,
        decisionId,
        status: 'pending_evaluation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        evaluationResults: null,
        executionResults: null
      };
      
      // Add to decision queue
      this.decisionQueue.push(decision);
      
      logger.info(`Decision created: ${decisionId} (${decisionData.decisionType})`);
      
      // Trigger evaluation
      this.evaluateDecision(decisionId);
      
      return decision;
    } catch (error) {
      logger.error(`Decision creation error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Evaluate a decision against safety checks and policy rules
   * @param {string} decisionId - The ID of the decision to evaluate
   * @returns {Object} - The evaluation results
   */
  async evaluateDecision(decisionId) {
    try {
      // Find the decision
      const decisionIndex = this.decisionQueue.findIndex(d => d.decisionId === decisionId);
      if (decisionIndex === -1) {
        throw new Error(`Decision ${decisionId} not found in queue`);
      }
      
      const decision = this.decisionQueue[decisionIndex];
      
      // Update decision status
      decision.status = 'evaluating';
      decision.updatedAt = new Date().toISOString();
      
      // Run all safety checks
      const evaluationResults = {
        checks: [],
        passed: true,
        requiresApproval: false,
        reason: null
      };
      
      for (const check of this.safetyChecks) {
        const result = await check.check(decision);
        evaluationResults.checks.push({
          name: check.name,
          passed: result.passed,
          reason: result.reason
        });
        
        if (!result.passed) {
          evaluationResults.passed = false;
          evaluationResults.reason = result.reason;
          break;
        }
      }
      
      // If all safety checks pass, check if approval is required
      if (evaluationResults.passed) {
        const policy = this.policies.get(decision.policyName);
        
        // Check approval rules
        if (policy.approvalRules) {
          for (const condition of policy.approvalRules.requireApprovalWhen || []) {
            // Implement condition checking based on the decision
            if (this.checkCondition(decision, condition)) {
              evaluationResults.requiresApproval = true;
              evaluationResults.reason = `Approval required due to condition: ${condition}`;
              break;
            }
          }
          
          // Check auto-approve conditions only if approval is required
          if (evaluationResults.requiresApproval) {
            for (const condition of policy.approvalRules.autoApproveWhen || []) {
              if (this.checkCondition(decision, condition)) {
                evaluationResults.requiresApproval = false;
                evaluationResults.reason = `Auto-approved due to condition: ${condition}`;
                break;
              }
            }
          }
        }
      }
      
      // Update decision with evaluation results
      decision.evaluationResults = evaluationResults;
      
      // Update decision status based on evaluation
      if (!evaluationResults.passed) {
        decision.status = 'rejected';
        logger.info(`Decision ${decisionId} rejected: ${evaluationResults.reason}`);
      } else if (evaluationResults.requiresApproval) {
        decision.status = 'pending_approval';
        logger.info(`Decision ${decisionId} requires approval: ${evaluationResults.reason}`);
      } else {
        decision.status = 'approved';
        // Automatically execute approved decisions
        await this.executeDecision(decisionId);
      }
      
      decision.updatedAt = new Date().toISOString();
      
      // Return evaluation results
      return evaluationResults;
    } catch (error) {
      logger.error(`Decision evaluation error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check if a decision matches a condition
   * @param {Object} decision - The decision to check
   * @param {string} condition - The condition to check
   * @returns {boolean} - Whether the condition is met
   */
  checkCondition(decision, condition) {
    // Implement condition checking logic based on the specific conditions
    switch (condition) {
      case 'impactsVipAirlines':
        return (decision.impact && decision.impact.airlinesAffected && 
                decision.impact.airlinesAffected.some(airline => this.isVipAirline(airline)));
        
      case 'crossesTerminals':
        if (decision.decisionType === 'stand_reallocation') {
          const fromStands = decision.proposedAction.details.fromStands || [];
          const toStands = decision.proposedAction.details.toStands || [];
          return this.involvesDifferentTerminals(fromStands, toStands);
        }
        return false;
        
      case 'sameTerminal':
        if (decision.decisionType === 'stand_reallocation') {
          const fromStands = decision.proposedAction.details.fromStands || [];
          const toStands = decision.proposedAction.details.toStands || [];
          return !this.involvesDifferentTerminals(fromStands, toStands);
        }
        return false;
        
      case 'sameAirline':
        if (decision.impact && decision.impact.airlinesAffected) {
          return decision.impact.airlinesAffected.length === 1;
        }
        return false;
        
      default:
        logger.warn(`Unknown condition: ${condition}`);
        return false;
    }
  }
  
  /**
   * Check if an airline is a VIP airline
   * @param {string} airlineCode - The airline code
   * @returns {boolean} - Whether the airline is a VIP airline
   */
  isVipAirline(airlineCode) {
    // This would typically check against a stored list of VIP airlines
    // For now, we'll just return false as a placeholder
    return false;
  }
  
  /**
   * Check if stands involve different terminals
   * @param {Array} fromStands - The source stands
   * @param {Array} toStands - The destination stands
   * @returns {boolean} - Whether the stands involve different terminals
   */
  involvesDifferentTerminals(fromStands, toStands) {
    // Extract terminal information from stand IDs
    // This implementation assumes stand IDs follow a format like "T1-A1", "T2-B3"
    // A real implementation would need to query the database for stand information
    const getTerminal = (standId) => standId.split('-')[0];
    
    const fromTerminals = new Set(fromStands.map(getTerminal));
    const toTerminals = new Set(toStands.map(getTerminal));
    
    // Check if there's any terminal in toTerminals that's not in fromTerminals
    for (const terminal of toTerminals) {
      if (!fromTerminals.has(terminal)) return true;
    }
    
    return false;
  }
  
  /**
   * Approve a decision that requires approval
   * @param {string} decisionId - The ID of the decision to approve
   * @param {Object} approvalData - The approval data
   * @returns {Object} - The approved decision
   */
  async approveDecision(decisionId, approvalData) {
    try {
      // Find the decision
      const decisionIndex = this.decisionQueue.findIndex(d => d.decisionId === decisionId);
      if (decisionIndex === -1) {
        throw new Error(`Decision ${decisionId} not found in queue`);
      }
      
      const decision = this.decisionQueue[decisionIndex];
      
      // Check if decision is pending approval
      if (decision.status !== 'pending_approval') {
        throw new Error(`Decision ${decisionId} is not pending approval (status: ${decision.status})`);
      }
      
      // Update decision with approval information
      decision.status = 'approved';
      decision.approvedBy = approvalData.approvedBy;
      decision.approvedAt = new Date().toISOString();
      decision.approverNotes = approvalData.approverNotes;
      decision.modifications = approvalData.modifications;
      decision.updatedAt = new Date().toISOString();
      
      logger.info(`Decision ${decisionId} approved by ${approvalData.approvedBy}`);
      
      // Execute the approved decision
      await this.executeDecision(decisionId);
      
      return decision;
    } catch (error) {
      logger.error(`Decision approval error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Reject a decision that requires approval
   * @param {string} decisionId - The ID of the decision to reject
   * @param {Object} rejectionData - The rejection data
   * @returns {Object} - The rejected decision
   */
  async rejectDecision(decisionId, rejectionData) {
    try {
      // Find the decision
      const decisionIndex = this.decisionQueue.findIndex(d => d.decisionId === decisionId);
      if (decisionIndex === -1) {
        throw new Error(`Decision ${decisionId} not found in queue`);
      }
      
      const decision = this.decisionQueue[decisionIndex];
      
      // Check if decision is pending approval
      if (decision.status !== 'pending_approval') {
        throw new Error(`Decision ${decisionId} is not pending approval (status: ${decision.status})`);
      }
      
      // Update decision with rejection information
      decision.status = 'rejected';
      decision.rejectedBy = rejectionData.rejectedBy;
      decision.rejectedAt = new Date().toISOString();
      decision.rejectionReason = rejectionData.rejectionReason;
      decision.updatedAt = new Date().toISOString();
      
      logger.info(`Decision ${decisionId} rejected by ${rejectionData.rejectedBy}: ${rejectionData.rejectionReason}`);
      
      return decision;
    } catch (error) {
      logger.error(`Decision rejection error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Execute an approved decision
   * @param {string} decisionId - The ID of the decision to execute
   * @returns {Object} - The execution results
   */
  async executeDecision(decisionId) {
    try {
      // Find the decision
      const decisionIndex = this.decisionQueue.findIndex(d => d.decisionId === decisionId);
      if (decisionIndex === -1) {
        throw new Error(`Decision ${decisionId} not found in queue`);
      }
      
      const decision = this.decisionQueue[decisionIndex];
      
      // Check if decision is approved
      if (decision.status !== 'approved') {
        throw new Error(`Decision ${decisionId} is not approved (status: ${decision.status})`);
      }
      
      // Update decision status
      decision.status = 'executing';
      decision.executionStartedAt = new Date().toISOString();
      decision.updatedAt = new Date().toISOString();
      
      logger.info(`Executing decision ${decisionId} (${decision.decisionType})`);
      
      // Get the appropriate execution handler
      const handler = this.executionHandlers[decision.decisionType];
      if (!handler) {
        throw new Error(`No execution handler for decision type: ${decision.decisionType}`);
      }
      
      // Execute the decision
      const executionResults = await handler(decision);
      
      // Update decision with execution results
      decision.executionResults = executionResults;
      decision.executionCompletedAt = new Date().toISOString();
      decision.status = executionResults.success ? 'executed' : 'execution_failed';
      decision.updatedAt = new Date().toISOString();
      
      // Move to history
      this.decisionHistory.push({ ...decision });
      this.decisionQueue.splice(decisionIndex, 1);
      
      logger.info(`Decision ${decisionId} execution ${executionResults.success ? 'succeeded' : 'failed'}`);
      
      return executionResults;
    } catch (error) {
      logger.error(`Decision execution error: ${error.message}`);
      
      // Find the decision and update its status
      const decisionIndex = this.decisionQueue.findIndex(d => d.decisionId === decisionId);
      if (decisionIndex !== -1) {
        const decision = this.decisionQueue[decisionIndex];
        decision.status = 'execution_failed';
        decision.executionError = error.message;
        decision.executionCompletedAt = new Date().toISOString();
        decision.updatedAt = new Date().toISOString();
        
        // Move to history
        this.decisionHistory.push({ ...decision });
        this.decisionQueue.splice(decisionIndex, 1);
      }
      
      throw error;
    }
  }
  
  /**
   * Get decisions from the queue
   * @param {Object} filters - Filters for the decisions
   * @returns {Array} - The filtered decisions
   */
  async getDecisionQueue(filters = {}) {
    try {
      let decisions = [...this.decisionQueue];
      
      // Apply filters
      if (filters.status) {
        decisions = decisions.filter(d => d.status === filters.status);
      }
      
      if (filters.decisionType) {
        decisions = decisions.filter(d => d.decisionType === filters.decisionType);
      }
      
      // Sort by creation time (newest first)
      decisions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Pagination
      if (filters.limit) {
        const limit = parseInt(filters.limit);
        const offset = filters.offset ? parseInt(filters.offset) : 0;
        decisions = decisions.slice(offset, offset + limit);
      }
      
      return decisions;
    } catch (error) {
      logger.error(`Get decision queue error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get decision history
   * @param {Object} filters - Filters for the decision history
   * @returns {Array} - The filtered decision history
   */
  async getDecisionHistory(filters = {}) {
    try {
      let decisions = [...this.decisionHistory];
      
      // Apply filters
      if (filters.status) {
        decisions = decisions.filter(d => d.status === filters.status);
      }
      
      if (filters.decisionType) {
        decisions = decisions.filter(d => d.decisionType === filters.decisionType);
      }
      
      // Date range filtering
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        decisions = decisions.filter(d => new Date(d.createdAt) >= startDate);
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        decisions = decisions.filter(d => new Date(d.createdAt) <= endDate);
      }
      
      // Sort by creation time (newest first)
      decisions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Pagination
      if (filters.limit) {
        const limit = parseInt(filters.limit);
        const offset = filters.offset ? parseInt(filters.offset) : 0;
        decisions = decisions.slice(offset, offset + limit);
      }
      
      return decisions;
    } catch (error) {
      logger.error(`Get decision history error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a decision by ID
   * @param {string} decisionId - The ID of the decision to get
   * @returns {Object} - The decision
   */
  async getDecision(decisionId) {
    try {
      // Check queue first
      const queueDecision = this.decisionQueue.find(d => d.decisionId === decisionId);
      if (queueDecision) return queueDecision;
      
      // Check history
      const historyDecision = this.decisionHistory.find(d => d.decisionId === decisionId);
      if (historyDecision) return historyDecision;
      
      throw new Error(`Decision ${decisionId} not found`);
    } catch (error) {
      logger.error(`Get decision error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Generate metrics about autonomous operations
   * @param {Object} filters - Filters for the metrics
   * @returns {Object} - The metrics
   */
  async getOperationalMetrics(filters = {}) {
    try {
      const metrics = {
        totalDecisions: this.decisionHistory.length,
        successRate: 0,
        averageExecutionTime: 0,
        decisionTypeBreakdown: {},
        statusBreakdown: {},
        timeDistribution: {
          hourly: Array(24).fill(0),
          daily: Array(7).fill(0),
          monthly: Array(12).fill(0)
        }
      };
      
      // Filter decisions for metrics
      let decisions = [...this.decisionHistory];
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        decisions = decisions.filter(d => new Date(d.createdAt) >= startDate);
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        decisions = decisions.filter(d => new Date(d.createdAt) <= endDate);
      }
      
      if (decisions.length === 0) {
        return metrics;
      }
      
      // Calculate success rate
      const successfulDecisions = decisions.filter(d => d.status === 'executed');
      metrics.successRate = successfulDecisions.length / decisions.length;
      
      // Calculate average execution time
      let totalExecutionTime = 0;
      let executedCount = 0;
      
      for (const decision of decisions) {
        if (decision.executionStartedAt && decision.executionCompletedAt) {
          const startTime = new Date(decision.executionStartedAt);
          const endTime = new Date(decision.executionCompletedAt);
          const executionTime = (endTime - startTime) / 1000; // in seconds
          
          totalExecutionTime += executionTime;
          executedCount++;
        }
      }
      
      if (executedCount > 0) {
        metrics.averageExecutionTime = totalExecutionTime / executedCount;
      }
      
      // Calculate decision type breakdown
      for (const decision of decisions) {
        if (!metrics.decisionTypeBreakdown[decision.decisionType]) {
          metrics.decisionTypeBreakdown[decision.decisionType] = 0;
        }
        metrics.decisionTypeBreakdown[decision.decisionType]++;
      }
      
      // Calculate status breakdown
      for (const decision of decisions) {
        if (!metrics.statusBreakdown[decision.status]) {
          metrics.statusBreakdown[decision.status] = 0;
        }
        metrics.statusBreakdown[decision.status]++;
      }
      
      // Calculate time distribution
      for (const decision of decisions) {
        const date = new Date(decision.createdAt);
        
        // Hourly distribution
        const hour = date.getHours();
        metrics.timeDistribution.hourly[hour]++;
        
        // Daily distribution (0 = Sunday, 6 = Saturday)
        const day = date.getDay();
        metrics.timeDistribution.daily[day]++;
        
        // Monthly distribution (0 = January, 11 = December)
        const month = date.getMonth();
        metrics.timeDistribution.monthly[month]++;
      }
      
      return metrics;
    } catch (error) {
      logger.error(`Get operational metrics error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AutonomousOperationsService();