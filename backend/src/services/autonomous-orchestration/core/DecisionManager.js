/**
 * Decision Manager
 * 
 * Manages the lifecycle of decisions, from creation to execution,
 * including approval workflows, dependency management, and execution coordination.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../utils/logger');
const Decision = require('../../../models/Decision');
const Action = require('../../../models/Action');
const Approval = require('../../../models/Approval');
const OrchestrationEvent = require('../../../models/OrchestrationEvent');
const SystemState = require('../../../models/SystemState');

class DecisionManager {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
    
    // Component references to be injected or initialized
    this.multiDomainCoordinator = options.multiDomainCoordinator;
    this.riskAnalyzer = options.riskAnalyzer;
    this.optimizationEngine = options.optimizationEngine;
    this.operatingModeController = options.operatingModeController;
    this.eventBus = options.eventBus;
    this.domainAdapters = options.domainAdapters || {};
    
    // Map to track executing decisions
    this.executingDecisions = new Map();
    
    // Approval expiry check interval
    this.approvalCheckInterval = null;
    
    // Decision execution concurrency limit
    this.maxConcurrentExecutions = options.maxConcurrentExecutions || 5;
  }

  /**
   * Initialize the decision manager
   */
  async initialize() {
    if (this.initialized) return;
    
    logger.info('Initializing Decision Manager');
    
    // Initialize required components
    if (!this.multiDomainCoordinator) {
      throw new Error('Multi-Domain Coordinator is required');
    }
    
    // Start the approval expiry check
    this._startApprovalExpiryCheck();
    
    this.initialized = true;
    logger.info('Decision Manager initialized successfully');
    
    return this;
  }

  /**
   * Create a new decision
   */
  async createDecision(decisionData) {
    await this._ensureInitialized();
    
    logger.info('Creating new decision', { type: decisionData.type });
    
    // Generate correlation ID if not provided
    const correlationId = decisionData.correlation_id || uuidv4();
    
    // Prepare initial decision data
    const initialData = {
      ...decisionData,
      id: uuidv4(),
      status: 'PROPOSED',
      correlation_id: correlationId,
      initiated_at: new Date().toISOString()
    };
    
    // Analyze risk if risk analyzer is available
    if (this.riskAnalyzer && (!initialData.risk || !initialData.confidence)) {
      try {
        const riskAnalysis = await this.riskAnalyzer.analyzeRisk(initialData);
        initialData.risk = riskAnalysis.risk;
        initialData.confidence = riskAnalysis.confidence;
      } catch (error) {
        logger.warn('Risk analysis failed, using default values', { error: error.message });
        initialData.risk = initialData.risk || 0.5;
        initialData.confidence = initialData.confidence || 0.5;
      }
    }
    
    // Get current operating mode if not specified
    if (!initialData.operating_mode_id && this.operatingModeController) {
      const activeMode = await this.operatingModeController.getActiveMode();
      if (activeMode) {
        initialData.operating_mode_id = activeMode.id;
      }
    }
    
    // Create the decision
    const decision = await Decision.query().insert(initialData);
    
    // Create actions if provided
    if (decisionData.actions && Array.isArray(decisionData.actions) && decisionData.actions.length > 0) {
      const actionPromises = decisionData.actions.map((actionData, index) => {
        return Action.query().insert({
          id: uuidv4(),
          decision_id: decision.id,
          type: actionData.type,
          domain: actionData.domain,
          description: actionData.description,
          parameters: actionData.parameters,
          status: 'PENDING',
          execution_order: index,
          retry_policy: actionData.retry_policy || {
            maxRetries: 3,
            retryCount: 0,
            retryDelay: 1000
          }
        });
      });
      
      await Promise.all(actionPromises);
    }
    
    // Create decision created event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'DECISION_CREATED',
      source: 'decision-manager',
      related_entity_id: decision.id,
      related_entity_type: 'DECISION',
      correlation_id: correlationId,
      payload: {
        type: decision.type,
        priority: decision.priority
      }
    });
    
    return decision;
  }

  /**
   * Process a decision through its workflow
   */
  async processDecision(decisionId) {
    await this._ensureInitialized();
    
    // Get the decision with its actions
    const decision = await Decision.query()
      .findById(decisionId)
      .withGraphFetched('actions');
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }
    
    logger.info(`Processing decision ${decisionId}`, { type: decision.type, status: decision.status });
    
    // Check current status
    if (decision.status !== 'PROPOSED') {
      logger.warn(`Cannot process decision ${decisionId} in status ${decision.status}`);
      return decision;
    }
    
    // Check if the decision requires approval
    const requiresApproval = await this.requiresApproval(decision);
    
    if (requiresApproval) {
      // Create approval request
      await this.requestApproval(decisionId);
    } else {
      // Auto-approve the decision
      await this.approveDecision(decisionId, {
        approvedBy: 'autonomous-system',
        notes: 'Auto-approved based on confidence and operating mode'
      });
    }
    
    return decision;
  }

  /**
   * Check if a decision requires human approval
   */
  async requiresApproval(decision) {
    await this._ensureInitialized();
    
    // If no operating mode controller, default to requiring approval
    if (!this.operatingModeController) {
      return true;
    }
    
    // Get current operating mode
    const activeMode = await this.operatingModeController.getActiveMode();
    if (!activeMode) {
      return true;
    }
    
    // Get current system state
    const systemState = await SystemState.getMostRecent();
    if (!systemState) {
      return true;
    }
    
    // Determine the primary domain
    let primaryDomain = 'CAPACITY'; // Default
    
    if (decision.actions && decision.actions.length > 0) {
      primaryDomain = decision.actions[0].domain;
    } else if (decision.domain_details && decision.domain_details.primaryDomain) {
      primaryDomain = decision.domain_details.primaryDomain;
    }
    
    // Check autonomy level for the domain
    const autonomyLevel = systemState.autonomy_levels[primaryDomain.toLowerCase()];
    
    if (!autonomyLevel) {
      return true;
    }
    
    // Determine if approval is required based on autonomy level
    if (autonomyLevel === 'FULLY_AUTONOMOUS') {
      return false;
    } else if (autonomyLevel === 'SUPERVISED_AUTONOMOUS') {
      // Require approval based on confidence and risk thresholds
      const { requiredConfidenceScore, maxAcceptableRisk } = activeMode.decision_thresholds;
      
      if (decision.confidence >= requiredConfidenceScore && decision.risk <= maxAcceptableRisk) {
        return false;
      }
    }
    
    // By default, require approval for all other autonomy levels
    return true;
  }

  /**
   * Request approval for a decision
   */
  async requestApproval(decisionId) {
    await this._ensureInitialized();
    
    // Get the decision
    const decision = await Decision.query().findById(decisionId);
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }
    
    logger.info(`Requesting approval for decision ${decisionId}`);
    
    // Set expiry date (default: 24 hours)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    
    // Create approval request
    const approval = await Approval.query().insert({
      id: uuidv4(),
      decision_id: decisionId,
      status: 'PENDING',
      expires_at: expiryDate.toISOString()
    });
    
    // Create approval requested event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'APPROVAL_REQUESTED',
      source: 'decision-manager',
      related_entity_id: decision.id,
      related_entity_type: 'DECISION',
      correlation_id: decision.correlation_id,
      payload: {
        approval_id: approval.id,
        expires_at: approval.expires_at
      }
    });
    
    return approval;
  }

  /**
   * Approve a decision
   */
  async approveDecision(decisionId, approvalData) {
    await this._ensureInitialized();
    
    // Get the decision
    const decision = await Decision.query().findById(decisionId);
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }
    
    if (decision.status !== 'PROPOSED') {
      throw new Error(`Cannot approve decision ${decisionId} in status ${decision.status}`);
    }
    
    logger.info(`Approving decision ${decisionId}`);
    
    // Check if there's a pending approval
    let approval = await Approval.query()
      .where('decision_id', decisionId)
      .where('status', 'PENDING')
      .first();
    
    // Update approval if exists
    if (approval) {
      await approval.$query().patch({
        status: 'APPROVED',
        approved_by: approvalData.approvedBy,
        approved_at: new Date().toISOString(),
        notes: approvalData.notes
      });
    } else {
      // Create a new approved approval (for auto-approved decisions)
      approval = await Approval.query().insert({
        id: uuidv4(),
        decision_id: decisionId,
        status: 'APPROVED',
        approved_by: approvalData.approvedBy,
        approved_at: new Date().toISOString(),
        notes: approvalData.notes
      });
    }
    
    // Update decision status
    await Decision.query()
      .findById(decisionId)
      .patch({ status: 'APPROVED' });
    
    // Create decision approved event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'DECISION_APPROVED',
      source: 'decision-manager',
      related_entity_id: decision.id,
      related_entity_type: 'DECISION',
      correlation_id: decision.correlation_id,
      payload: {
        approved_by: approvalData.approvedBy,
        automatic: approvalData.approvedBy === 'autonomous-system'
      }
    });
    
    // Notify via event bus if available
    if (this.eventBus) {
      await this.eventBus.publish('decision.status.changed', {
        decisionId,
        oldStatus: 'PROPOSED',
        newStatus: 'APPROVED'
      });
    }
    
    // Execute the decision if auto-execution is enabled
    if (this.options.autoExecuteApproved !== false) {
      await this.executeDecision(decisionId);
    }
    
    return { decision, approval };
  }

  /**
   * Reject a decision
   */
  async rejectDecision(decisionId, rejectionData) {
    await this._ensureInitialized();
    
    // Get the decision
    const decision = await Decision.query().findById(decisionId);
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }
    
    if (decision.status !== 'PROPOSED') {
      throw new Error(`Cannot reject decision ${decisionId} in status ${decision.status}`);
    }
    
    logger.info(`Rejecting decision ${decisionId}`);
    
    // Check if there's a pending approval
    let approval = await Approval.query()
      .where('decision_id', decisionId)
      .where('status', 'PENDING')
      .first();
    
    // Update approval if exists
    if (approval) {
      await approval.$query().patch({
        status: 'REJECTED',
        approved_by: rejectionData.rejectedBy,
        notes: rejectionData.notes
      });
    } else {
      // Create a new rejected approval
      approval = await Approval.query().insert({
        id: uuidv4(),
        decision_id: decisionId,
        status: 'REJECTED',
        approved_by: rejectionData.rejectedBy,
        notes: rejectionData.notes
      });
    }
    
    // Update decision status
    await Decision.query()
      .findById(decisionId)
      .patch({ status: 'CANCELED' });
    
    // Create decision rejected event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'DECISION_REJECTED',
      source: 'decision-manager',
      related_entity_id: decision.id,
      related_entity_type: 'DECISION',
      correlation_id: decision.correlation_id,
      payload: {
        rejected_by: rejectionData.rejectedBy,
        reason: rejectionData.notes
      }
    });
    
    // Notify via event bus if available
    if (this.eventBus) {
      await this.eventBus.publish('decision.status.changed', {
        decisionId,
        oldStatus: 'PROPOSED',
        newStatus: 'CANCELED'
      });
    }
    
    return { decision, approval };
  }

  /**
   * Execute an approved decision
   */
  async executeDecision(decisionId) {
    await this._ensureInitialized();
    
    // Check if already executing
    if (this.executingDecisions.has(decisionId)) {
      logger.info(`Decision ${decisionId} is already executing, ignoring duplicate request`);
      return { success: false, message: 'Decision is already executing' };
    }
    
    // Get the decision with its actions
    const decision = await Decision.query()
      .findById(decisionId)
      .withGraphFetched('[actions, dependencies]');
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }
    
    if (decision.status !== 'APPROVED') {
      throw new Error(`Cannot execute decision ${decisionId} in status ${decision.status}`);
    }
    
    // Check dependencies
    const canExecute = await decision.canExecute();
    if (!canExecute) {
      logger.info(`Decision ${decisionId} has unmet dependencies, deferring execution`);
      
      // Return without error, but indicate that execution is deferred
      return { 
        success: false, 
        message: 'Decision has unmet dependencies, execution deferred' 
      };
    }
    
    // Add to executing map
    this.executingDecisions.set(decisionId, {
      decisionId,
      startedAt: new Date(),
      status: 'EXECUTING'
    });
    
    // Update decision status
    await Decision.query()
      .findById(decisionId)
      .patch({ status: 'EXECUTING' });
    
    logger.info(`Executing decision ${decisionId}`, { type: decision.type });
    
    // Create decision execution started event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'DECISION_EXECUTION_STARTED',
      source: 'decision-manager',
      related_entity_id: decision.id,
      related_entity_type: 'DECISION',
      correlation_id: decision.correlation_id,
      payload: {
        action_count: decision.actions ? decision.actions.length : 0
      }
    });
    
    // Notify via event bus if available
    if (this.eventBus) {
      await this.eventBus.publish('decision.status.changed', {
        decisionId,
        oldStatus: 'APPROVED',
        newStatus: 'EXECUTING'
      });
    }
    
    try {
      // Sort actions by execution order
      const sortedActions = [...(decision.actions || [])]
        .sort((a, b) => a.execution_order - b.execution_order);
      
      // Build coordination plan with the multi-domain coordinator
      const coordinationPlan = await this.multiDomainCoordinator.buildCoordinationPlan(sortedActions);
      
      // Execute the coordination plan
      const result = await this.multiDomainCoordinator.executeCoordinationPlan(coordinationPlan);
      
      // Mark decision as completed
      await Decision.query()
        .findById(decisionId)
        .patch({ 
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        });
      
      // Remove from executing map
      this.executingDecisions.delete(decisionId);
      
      // Create decision completed event
      await OrchestrationEvent.query().insert({
        timestamp: new Date().toISOString(),
        event_type: 'DECISION_EXECUTION_COMPLETED',
        source: 'decision-manager',
        related_entity_id: decision.id,
        related_entity_type: 'DECISION',
        correlation_id: decision.correlation_id,
        payload: {
          success: true,
          duration_ms: new Date() - this.executingDecisions.get(decisionId).startedAt
        }
      });
      
      // Notify via event bus if available
      if (this.eventBus) {
        await this.eventBus.publish('decision.status.changed', {
          decisionId,
          oldStatus: 'EXECUTING',
          newStatus: 'COMPLETED'
        });
      }
      
      logger.info(`Decision ${decisionId} executed successfully`);
      
      return { success: true, result };
    } catch (error) {
      logger.error(`Error executing decision ${decisionId}: ${error.message}`, { error });
      
      // Mark decision as failed
      await Decision.query()
        .findById(decisionId)
        .patch({ 
          status: 'FAILED',
          completed_at: new Date().toISOString()
        });
      
      // Remove from executing map
      this.executingDecisions.delete(decisionId);
      
      // Create decision failed event
      await OrchestrationEvent.query().insert({
        timestamp: new Date().toISOString(),
        event_type: 'DECISION_EXECUTION_FAILED',
        source: 'decision-manager',
        related_entity_id: decision.id,
        related_entity_type: 'DECISION',
        correlation_id: decision.correlation_id,
        payload: {
          error: error.message
        }
      });
      
      // Notify via event bus if available
      if (this.eventBus) {
        await this.eventBus.publish('decision.status.changed', {
          decisionId,
          oldStatus: 'EXECUTING',
          newStatus: 'FAILED'
        });
      }
      
      throw error;
    }
  }

  /**
   * Cancel a decision
   */
  async cancelDecision(decisionId, reason) {
    await this._ensureInitialized();
    
    // Get the decision
    const decision = await Decision.query().findById(decisionId);
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }
    
    // Check if decision can be canceled
    if (decision.status !== 'PROPOSED' && decision.status !== 'APPROVED') {
      throw new Error(`Cannot cancel decision ${decisionId} in status ${decision.status}`);
    }
    
    logger.info(`Canceling decision ${decisionId}`);
    
    // Update decision status
    await Decision.query()
      .findById(decisionId)
      .patch({ status: 'CANCELED' });
    
    // Create decision canceled event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'DECISION_CANCELED',
      source: 'decision-manager',
      related_entity_id: decision.id,
      related_entity_type: 'DECISION',
      correlation_id: decision.correlation_id,
      payload: {
        reason: reason || 'No reason provided'
      }
    });
    
    // Notify via event bus if available
    if (this.eventBus) {
      await this.eventBus.publish('decision.status.changed', {
        decisionId,
        oldStatus: decision.status,
        newStatus: 'CANCELED'
      });
    }
    
    return decision;
  }

  /**
   * Get the current status of a decision
   */
  async getDecisionStatus(decisionId) {
    await this._ensureInitialized();
    
    // Get the decision
    const decision = await Decision.query().findById(decisionId);
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }
    
    return decision.status;
  }

  /**
   * Retrieve decisions matching specified criteria
   */
  async queryDecisions(criteria = {}) {
    await this._ensureInitialized();
    
    // Build query
    let query = Decision.query();
    
    // Apply filters
    if (criteria.status) {
      query = query.where('status', criteria.status);
    }
    
    if (criteria.type) {
      query = query.where('type', criteria.type);
    }
    
    if (criteria.from) {
      query = query.where('initiated_at', '>=', criteria.from);
    }
    
    if (criteria.to) {
      query = query.where('initiated_at', '<=', criteria.to);
    }
    
    if (criteria.priority) {
      query = query.where('priority', criteria.priority);
    }
    
    if (criteria.requested_by) {
      query = query.where('requested_by', criteria.requested_by);
    }
    
    // Apply sorting
    const sortField = criteria.sortBy || 'initiated_at';
    const sortOrder = criteria.sortOrder || 'desc';
    query = query.orderBy(sortField, sortOrder);
    
    // Apply pagination
    if (criteria.limit) {
      query = query.limit(criteria.limit);
    }
    
    if (criteria.offset) {
      query = query.offset(criteria.offset);
    }
    
    return query;
  }

  /**
   * Add a dependency between decisions
   */
  async addDecisionDependency(dependentId, dependencyId, dependencyType = 'REQUIRES') {
    await this._ensureInitialized();
    
    // Check if both decisions exist
    const dependent = await Decision.query().findById(dependentId);
    const dependency = await Decision.query().findById(dependencyId);
    
    if (!dependent) {
      throw new Error(`Dependent decision ${dependentId} not found`);
    }
    
    if (!dependency) {
      throw new Error(`Dependency decision ${dependencyId} not found`);
    }
    
    // Check for circular dependency
    const isCircular = await this._wouldCreateCircularDependency(dependentId, dependencyId);
    if (isCircular) {
      throw new Error('Adding this dependency would create a circular dependency');
    }
    
    // Add the dependency
    await dependent.$relatedQuery('dependencies').relate({
      id: dependencyId,
      dependency_type: dependencyType
    });
    
    logger.info(`Added dependency from ${dependentId} to ${dependencyId}`);
    
    return true;
  }

  /**
   * Process dependency violations for completed decisions
   */
  async processDependents(completedDecisionId) {
    await this._ensureInitialized();
    
    // Get the decision
    const completedDecision = await Decision.query()
      .findById(completedDecisionId)
      .withGraphFetched('dependents');
    
    if (!completedDecision) {
      throw new Error(`Decision ${completedDecisionId} not found`);
    }
    
    if (completedDecision.status !== 'COMPLETED') {
      throw new Error(`Decision ${completedDecisionId} is not completed`);
    }
    
    if (!completedDecision.dependents || completedDecision.dependents.length === 0) {
      // No dependents to process
      return [];
    }
    
    const processedDecisions = [];
    
    // Check each dependent to see if all dependencies are completed
    for (const dependent of completedDecision.dependents) {
      // Skip if not in APPROVED status
      if (dependent.status !== 'APPROVED') {
        continue;
      }
      
      // Check if dependent can be executed now
      const canExecute = await dependent.canExecute();
      
      if (canExecute) {
        logger.info(`Dependency satisfied, executing dependent decision ${dependent.id}`);
        
        try {
          // Execute the dependent decision
          const result = await this.executeDecision(dependent.id);
          processedDecisions.push({
            id: dependent.id,
            success: true,
            result
          });
        } catch (error) {
          logger.error(`Error executing dependent decision ${dependent.id}: ${error.message}`);
          processedDecisions.push({
            id: dependent.id,
            success: false,
            error: error.message
          });
        }
      }
    }
    
    return processedDecisions;
  }

  /**
   * Start approval expiry check
   */
  _startApprovalExpiryCheck() {
    const interval = this.options.approvalCheckInterval || 300000; // Default: 5 minutes
    
    // Clear any existing interval
    if (this.approvalCheckInterval) {
      clearInterval(this.approvalCheckInterval);
    }
    
    // Set up periodic check
    this.approvalCheckInterval = setInterval(async () => {
      try {
        const expiredCount = await Approval.expireStaleApprovals();
        
        if (expiredCount > 0) {
          logger.info(`Expired ${expiredCount} stale approval requests`);
        }
      } catch (error) {
        logger.error('Error checking for expired approvals', { error: error.message });
      }
    }, interval);
    
    logger.info(`Started approval expiry check with interval ${interval}ms`);
  }

  /**
   * Check if adding a dependency would create a circular dependency
   */
  async _wouldCreateCircularDependency(dependentId, dependencyId) {
    // Simple check: are they the same decision?
    if (dependentId === dependencyId) {
      return true;
    }
    
    // Check if dependency depends on dependent (directly or indirectly)
    const visited = new Set();
    const toVisit = [dependencyId];
    
    while (toVisit.length > 0) {
      const currentId = toVisit.pop();
      
      if (visited.has(currentId)) {
        continue;
      }
      
      visited.add(currentId);
      
      // Get dependencies of the current decision
      const current = await Decision.query()
        .findById(currentId)
        .withGraphFetched('dependencies');
      
      if (current && current.dependencies) {
        for (const dep of current.dependencies) {
          if (dep.id === dependentId) {
            // Found a circular dependency
            return true;
          }
          
          if (!visited.has(dep.id)) {
            toVisit.push(dep.id);
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Ensure the decision manager is initialized
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

module.exports = DecisionManager;