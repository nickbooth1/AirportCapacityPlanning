/**
 * Multi-Domain Coordinator
 * 
 * Coordinates actions across domain boundaries, manages dependencies
 * and execution order, and ensures synchronization between different systems.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../utils/logger');
const Action = require('../../../models/Action');
const OrchestrationEvent = require('../../../models/OrchestrationEvent');

class MultiDomainCoordinator {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
    
    // Component references to be injected or initialized
    this.domainAdapters = options.domainAdapters || {};
    this.eventBus = options.eventBus;
    
    // Active coordination plans
    this.activePlans = new Map();
    
    // Maximum concurrent actions per domain
    this.maxConcurrentActions = options.maxConcurrentActions || {
      default: 5 // Default concurrency limit
    };
    
    // Active actions per domain
    this.activeActions = {
      // domain: Set of action IDs
    };
  }

  /**
   * Initialize the coordinator
   */
  async initialize() {
    if (this.initialized) return;
    
    logger.info('Initializing Multi-Domain Coordinator');
    
    // Validate domain adapters
    if (Object.keys(this.domainAdapters).length === 0) {
      logger.warn('No domain adapters provided to Multi-Domain Coordinator');
    } else {
      logger.info(`Registered domain adapters: ${Object.keys(this.domainAdapters).join(', ')}`);
    }
    
    // Initialize active actions tracking
    for (const domain of Object.keys(this.domainAdapters)) {
      this.activeActions[domain] = new Set();
    }
    
    this.initialized = true;
    logger.info('Multi-Domain Coordinator initialized successfully');
    
    return this;
  }

  /**
   * Register an action for coordination
   */
  async registerAction(action) {
    await this._ensureInitialized();
    
    // Get the action if only ID was provided
    let actionData = action;
    if (typeof action === 'string') {
      actionData = await Action.query().findById(action);
      if (!actionData) {
        throw new Error(`Action ${action} not found`);
      }
    }
    
    logger.info(`Registering action for coordination: ${actionData.id}`, {
      type: actionData.type,
      domain: actionData.domain
    });
    
    // Check if domain adapter exists
    const domainAdapter = this.domainAdapters[actionData.domain];
    if (!domainAdapter) {
      throw new Error(`No adapter registered for domain: ${actionData.domain}`);
    }
    
    // Validate action with domain adapter
    if (typeof domainAdapter.validateAction === 'function') {
      const validationResult = await domainAdapter.validateAction(actionData);
      
      if (!validationResult.valid) {
        throw new Error(`Action validation failed: ${validationResult.error}`);
      }
    }
    
    // Return the registered action
    return {
      id: actionData.id,
      type: actionData.type,
      domain: actionData.domain,
      parameters: actionData.parameters,
      execution_order: actionData.execution_order,
      validated: true
    };
  }

  /**
   * Build a coordination plan for a set of actions
   */
  async buildCoordinationPlan(actions) {
    await this._ensureInitialized();
    
    logger.info(`Building coordination plan for ${actions.length} actions`);
    
    // Register all actions
    const registeredActions = [];
    for (const action of actions) {
      try {
        const registeredAction = await this.registerAction(action);
        registeredActions.push(registeredAction);
      } catch (error) {
        logger.error(`Failed to register action ${action.id}: ${error.message}`);
        throw error;
      }
    }
    
    // Resolve dependencies between actions
    const dependencies = await this.resolveDependencies(registeredActions);
    
    // Create execution groups based on dependencies
    const executionGroups = this._createExecutionGroups(registeredActions, dependencies);
    
    // Create synchronization plan
    const synchronizationPlan = await this.synchronizeExecution(registeredActions, executionGroups);
    
    // Create the coordination plan
    const planId = uuidv4();
    const plan = {
      id: planId,
      actions: registeredActions,
      dependencies,
      executionGroups,
      synchronizationPlan,
      createdAt: new Date().toISOString()
    };
    
    // Store the plan
    this.activePlans.set(planId, {
      plan,
      status: 'CREATED',
      currentGroup: 0,
      completedActions: new Set(),
      failedActions: new Set()
    });
    
    // Create coordination plan event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'COORDINATION_PLAN_CREATED',
      source: 'multi-domain-coordinator',
      payload: {
        plan_id: planId,
        action_count: registeredActions.length,
        group_count: executionGroups.length
      }
    });
    
    return planId;
  }

  /**
   * Execute a coordination plan
   */
  async executeCoordinationPlan(planId) {
    await this._ensureInitialized();
    
    // Get the plan
    const planState = this.activePlans.get(planId);
    if (!planState) {
      throw new Error(`Coordination plan ${planId} not found`);
    }
    
    const plan = planState.plan;
    
    logger.info(`Executing coordination plan ${planId} with ${plan.executionGroups.length} groups`);
    
    // Update plan status
    planState.status = 'EXECUTING';
    
    // Create coordination plan execution started event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'COORDINATION_PLAN_EXECUTION_STARTED',
      source: 'multi-domain-coordinator',
      payload: {
        plan_id: planId,
        group_count: plan.executionGroups.length
      }
    });
    
    try {
      // Execute each group in sequence
      for (let groupIndex = 0; groupIndex < plan.executionGroups.length; groupIndex++) {
        const group = plan.executionGroups[groupIndex];
        
        // Update current group
        planState.currentGroup = groupIndex;
        
        logger.info(`Executing group ${groupIndex + 1}/${plan.executionGroups.length} with ${group.length} actions`);
        
        // Execute all actions in the group in parallel
        const actionPromises = group.map(actionId => this._executeAction(planId, actionId));
        
        // Wait for all actions in the group to complete
        await Promise.all(actionPromises);
        
        // Check if any actions failed
        if (planState.failedActions.size > 0) {
          throw new Error(`One or more actions failed in group ${groupIndex + 1}`);
        }
      }
      
      // All groups executed successfully
      planState.status = 'COMPLETED';
      
      // Create coordination plan execution completed event
      await OrchestrationEvent.query().insert({
        timestamp: new Date().toISOString(),
        event_type: 'COORDINATION_PLAN_EXECUTION_COMPLETED',
        source: 'multi-domain-coordinator',
        payload: {
          plan_id: planId,
          success: true,
          completed_actions: planState.completedActions.size
        }
      });
      
      logger.info(`Coordination plan ${planId} executed successfully`);
      
      return {
        success: true,
        completedActions: Array.from(planState.completedActions)
      };
    } catch (error) {
      // Plan execution failed
      planState.status = 'FAILED';
      
      // Create coordination plan execution failed event
      await OrchestrationEvent.query().insert({
        timestamp: new Date().toISOString(),
        event_type: 'COORDINATION_PLAN_EXECUTION_FAILED',
        source: 'multi-domain-coordinator',
        payload: {
          plan_id: planId,
          error: error.message,
          failed_actions: Array.from(planState.failedActions),
          completed_actions: Array.from(planState.completedActions)
        }
      });
      
      logger.error(`Coordination plan ${planId} execution failed: ${error.message}`);
      
      throw error;
    } finally {
      // Clean up plan state after execution (successful or failed)
      setTimeout(() => {
        if (this.activePlans.has(planId)) {
          this.activePlans.delete(planId);
        }
      }, 300000); // Keep plan state for 5 minutes for querying
    }
  }

  /**
   * Resolve dependencies between actions
   */
  async resolveDependencies(actions) {
    await this._ensureInitialized();
    
    // First, build a map of actions by ID for easy lookup
    const actionsMap = new Map();
    for (const action of actions) {
      actionsMap.set(action.id, action);
    }
    
    // Get existing dependencies from database
    const actionIds = actions.map(a => a.id);
    const existingDependencies = await Action.query()
      .whereIn('id', actionIds)
      .withGraphFetched('dependencies');
    
    // Build explicit dependencies map
    const explicitDependencies = new Map();
    for (const action of existingDependencies) {
      if (action.dependencies && action.dependencies.length > 0) {
        explicitDependencies.set(action.id, action.dependencies.map(d => d.id));
      } else {
        explicitDependencies.set(action.id, []);
      }
    }
    
    // Build implicit dependencies based on execution order
    const implicitDependencies = new Map();
    
    // Group actions by decision_id
    const actionsByDecision = new Map();
    for (const action of actions) {
      if (!actionsByDecision.has(action.decision_id)) {
        actionsByDecision.set(action.decision_id, []);
      }
      actionsByDecision.get(action.decision_id).push(action);
    }
    
    // For each decision, add implicit dependencies based on execution_order
    for (const [decisionId, decisionActions] of actionsByDecision.entries()) {
      // Sort actions by execution_order
      const sortedActions = [...decisionActions].sort((a, b) => a.execution_order - b.execution_order);
      
      // For each action, add implicit dependency to the previous action
      for (let i = 1; i < sortedActions.length; i++) {
        const currentAction = sortedActions[i];
        const previousAction = sortedActions[i - 1];
        
        if (!implicitDependencies.has(currentAction.id)) {
          implicitDependencies.set(currentAction.id, []);
        }
        
        implicitDependencies.get(currentAction.id).push(previousAction.id);
      }
    }
    
    // Add domain-specific dependencies based on domain adapters
    const domainDependencies = new Map();
    
    for (const action of actions) {
      const domainAdapter = this.domainAdapters[action.domain];
      if (!domainAdapter || typeof domainAdapter.getDependencies !== 'function') {
        continue;
      }
      
      try {
        const dependencies = await domainAdapter.getDependencies(action);
        
        if (dependencies && dependencies.length > 0) {
          // Filter to only include actions in the current plan
          const validDependencies = dependencies.filter(depId => actionsMap.has(depId));
          
          if (validDependencies.length > 0) {
            domainDependencies.set(action.id, validDependencies);
          }
        }
      } catch (error) {
        logger.warn(`Error getting domain dependencies for action ${action.id}: ${error.message}`);
      }
    }
    
    // Combine all dependencies
    const allDependencies = new Map();
    
    for (const action of actions) {
      const deps = new Set();
      
      // Add explicit dependencies
      if (explicitDependencies.has(action.id)) {
        for (const depId of explicitDependencies.get(action.id)) {
          if (actionsMap.has(depId)) {
            deps.add(depId);
          }
        }
      }
      
      // Add implicit dependencies
      if (implicitDependencies.has(action.id)) {
        for (const depId of implicitDependencies.get(action.id)) {
          deps.add(depId);
        }
      }
      
      // Add domain-specific dependencies
      if (domainDependencies.has(action.id)) {
        for (const depId of domainDependencies.get(action.id)) {
          deps.add(depId);
        }
      }
      
      // Save combined dependencies
      allDependencies.set(action.id, Array.from(deps));
    }
    
    // Check for cyclic dependencies
    this._detectCycles(allDependencies);
    
    return allDependencies;
  }

  /**
   * Check if an action can be executed based on dependencies
   */
  async canExecute(actionId, completedActions = []) {
    await this._ensureInitialized();
    
    // Get active plan for this action
    let planState = null;
    let plan = null;
    
    for (const [planId, state] of this.activePlans.entries()) {
      const actionIds = state.plan.actions.map(a => a.id);
      if (actionIds.includes(actionId)) {
        planState = state;
        plan = state.plan;
        break;
      }
    }
    
    if (!plan) {
      // Action not part of any active plan
      return true;
    }
    
    // Get dependencies for this action
    const dependencies = plan.dependencies.get(actionId) || [];
    
    // Check if all dependencies are completed
    const completedSet = new Set([...completedActions, ...planState.completedActions]);
    
    for (const depId of dependencies) {
      if (!completedSet.has(depId)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Notify of action completion for dependency tracking
   */
  async notifyActionComplete(actionId, result) {
    await this._ensureInitialized();
    
    // Find the plan this action belongs to
    for (const [planId, planState] of this.activePlans.entries()) {
      const actionIds = planState.plan.actions.map(a => a.id);
      
      if (actionIds.includes(actionId)) {
        // Mark action as completed
        planState.completedActions.add(actionId);
        
        // Get the action domain
        const action = planState.plan.actions.find(a => a.id === actionId);
        if (action && this.activeActions[action.domain]) {
          // Remove from active actions for the domain
          this.activeActions[action.domain].delete(actionId);
        }
        
        // Create action completed event
        await OrchestrationEvent.query().insert({
          timestamp: new Date().toISOString(),
          event_type: 'ACTION_COMPLETED',
          source: 'multi-domain-coordinator',
          related_entity_id: actionId,
          related_entity_type: 'ACTION',
          payload: {
            plan_id: planId,
            domain: action ? action.domain : 'unknown',
            type: action ? action.type : 'unknown'
          }
        });
        
        logger.info(`Action ${actionId} completed`);
        
        return true;
      }
    }
    
    // Action not found in any plan
    logger.warn(`Action ${actionId} not found in any active plan`);
    return false;
  }

  /**
   * Handle action failure within a coordination plan
   */
  async handleActionFailure(actionId, error) {
    await this._ensureInitialized();
    
    // Find the plan this action belongs to
    for (const [planId, planState] of this.activePlans.entries()) {
      const actionIds = planState.plan.actions.map(a => a.id);
      
      if (actionIds.includes(actionId)) {
        // Mark action as failed
        planState.failedActions.add(actionId);
        
        // Get the action domain
        const action = planState.plan.actions.find(a => a.id === actionId);
        if (action && this.activeActions[action.domain]) {
          // Remove from active actions for the domain
          this.activeActions[action.domain].delete(actionId);
        }
        
        // Create action failed event
        await OrchestrationEvent.query().insert({
          timestamp: new Date().toISOString(),
          event_type: 'ACTION_FAILED',
          source: 'multi-domain-coordinator',
          related_entity_id: actionId,
          related_entity_type: 'ACTION',
          payload: {
            plan_id: planId,
            domain: action ? action.domain : 'unknown',
            type: action ? action.type : 'unknown',
            error: error.message || String(error)
          }
        });
        
        logger.error(`Action ${actionId} failed: ${error.message}`);
        
        // Determine recovery action based on action type and domain
        if (action) {
          const domainAdapter = this.domainAdapters[action.domain];
          if (domainAdapter && typeof domainAdapter.handleFailure === 'function') {
            try {
              const recoveryAction = await domainAdapter.handleFailure(action, error);
              return recoveryAction;
            } catch (recoveryError) {
              logger.error(`Error handling failure for action ${actionId}: ${recoveryError.message}`);
            }
          }
        }
        
        // Default recovery action: abort the plan
        return { type: 'ABORT_PLAN', reason: error.message };
      }
    }
    
    // Action not found in any plan
    logger.warn(`Action ${actionId} not found in any active plan`);
    return { type: 'IGNORE', reason: 'Action not in active plan' };
  }

  /**
   * Synchronize timing of actions across domains
   */
  async synchronizeExecution(actions, executionGroups) {
    await this._ensureInitialized();
    
    // Build a map of actions by ID
    const actionsMap = new Map();
    for (const action of actions) {
      actionsMap.set(action.id, action);
    }
    
    // Create synchronization points for each group
    const synchronizationPlan = {};
    
    for (let i = 0; i < executionGroups.length; i++) {
      const group = executionGroups[i];
      
      // Create a synchronization point for this group
      const syncPoint = {
        groupIndex: i,
        actions: group.map(actionId => ({
          id: actionId,
          domain: actionsMap.get(actionId).domain,
          type: actionsMap.get(actionId).type
        })),
        waitForCompletion: true // Wait for all actions in this group to complete before proceeding
      };
      
      // Add domain-specific timing constraints if available
      for (const actionId of group) {
        const action = actionsMap.get(actionId);
        const domainAdapter = this.domainAdapters[action.domain];
        
        if (domainAdapter && typeof domainAdapter.getTimingConstraints === 'function') {
          try {
            const constraints = await domainAdapter.getTimingConstraints(action);
            
            if (constraints) {
              if (!syncPoint.timingConstraints) {
                syncPoint.timingConstraints = {};
              }
              
              syncPoint.timingConstraints[actionId] = constraints;
            }
          } catch (error) {
            logger.warn(`Error getting timing constraints for action ${actionId}: ${error.message}`);
          }
        }
      }
      
      synchronizationPlan[i] = syncPoint;
    }
    
    return synchronizationPlan;
  }

  /**
   * Execute an action as part of a coordination plan
   */
  async _executeAction(planId, actionId) {
    // Get the plan state
    const planState = this.activePlans.get(planId);
    if (!planState) {
      throw new Error(`Coordination plan ${planId} not found`);
    }
    
    // Get the action from the plan
    const action = planState.plan.actions.find(a => a.id === actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found in plan ${planId}`);
    }
    
    // Get the domain adapter
    const domainAdapter = this.domainAdapters[action.domain];
    if (!domainAdapter) {
      throw new Error(`No adapter registered for domain: ${action.domain}`);
    }
    
    // Check if we can execute now based on dependencies
    const canExecute = await this.canExecute(actionId, Array.from(planState.completedActions));
    if (!canExecute) {
      throw new Error(`Dependencies not met for action ${actionId}`);
    }
    
    // Check domain concurrency limits
    const domainConcurrencyLimit = this.maxConcurrentActions[action.domain] || 
                                   this.maxConcurrentActions.default;
    
    // Initialize domain set if not exists
    if (!this.activeActions[action.domain]) {
      this.activeActions[action.domain] = new Set();
    }
    
    // Wait if concurrency limit reached
    while (this.activeActions[action.domain].size >= domainConcurrencyLimit) {
      logger.info(`Concurrency limit reached for domain ${action.domain}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second and check again
    }
    
    // Mark action as active for this domain
    this.activeActions[action.domain].add(actionId);
    
    // Create action execution started event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'ACTION_EXECUTION_STARTED',
      source: 'multi-domain-coordinator',
      related_entity_id: actionId,
      related_entity_type: 'ACTION',
      payload: {
        plan_id: planId,
        domain: action.domain,
        type: action.type
      }
    });
    
    // Update action status in database
    await Action.query().findById(actionId).patch({
      status: 'EXECUTING',
      started_at: new Date().toISOString()
    });
    
    logger.info(`Executing action ${actionId} (${action.type}/${action.domain})`);
    
    try {
      // Execute the action through domain adapter
      const result = await domainAdapter.executeAction({
        id: action.id,
        type: action.type,
        parameters: action.parameters
      });
      
      // Mark action as completed in database
      await Action.query().findById(actionId).patch({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        result
      });
      
      // Notify of action completion
      await this.notifyActionComplete(actionId, result);
      
      return { actionId, success: true, result };
    } catch (error) {
      logger.error(`Action execution failed for ${actionId}: ${error.message}`);
      
      // Mark action as failed in database
      await Action.query().findById(actionId).patch({
        status: 'FAILED',
        completed_at: new Date().toISOString(),
        result: { error: error.message }
      });
      
      // Handle the failure
      const recoveryAction = await this.handleActionFailure(actionId, error);
      
      if (recoveryAction.type === 'ABORT_PLAN') {
        throw new Error(`Action ${actionId} failed: ${error.message}`);
      } else if (recoveryAction.type === 'RETRY') {
        // Implement retry logic here if needed
        throw new Error(`Action ${actionId} failed and retry not implemented: ${error.message}`);
      } else if (recoveryAction.type === 'SKIP') {
        logger.info(`Skipping failed action ${actionId} as per recovery plan`);
        return { actionId, success: false, skipped: true, error: error.message };
      } else {
        throw new Error(`Action ${actionId} failed: ${error.message}`);
      }
    }
  }

  /**
   * Create execution groups based on dependencies
   */
  _createExecutionGroups(actions, dependencies) {
    // Initialize groups
    const groups = [];
    const actionIds = actions.map(a => a.id);
    
    // Track which actions have been assigned to groups
    const assigned = new Set();
    
    // Track which actions are ready to be assigned (have all dependencies met)
    let ready = new Set();
    
    // Initialize ready set with actions that have no dependencies
    for (const actionId of actionIds) {
      const deps = dependencies.get(actionId) || [];
      if (deps.length === 0) {
        ready.add(actionId);
      }
    }
    
    // Process actions until all are assigned
    while (assigned.size < actionIds.length) {
      // If no actions are ready, there might be a cycle (should have been caught earlier)
      if (ready.size === 0) {
        const unassigned = actionIds.filter(id => !assigned.has(id));
        throw new Error(`Cannot create execution groups: possible cycle in ${unassigned.join(', ')}`);
      }
      
      // Create a new group with ready actions
      const group = Array.from(ready);
      groups.push(group);
      
      // Mark these actions as assigned
      for (const actionId of group) {
        assigned.add(actionId);
      }
      
      // Clear ready set for next iteration
      ready = new Set();
      
      // Find actions that are now ready (all dependencies are assigned)
      for (const actionId of actionIds) {
        if (assigned.has(actionId)) {
          continue; // Skip already assigned actions
        }
        
        const deps = dependencies.get(actionId) || [];
        const allDepsAssigned = deps.every(depId => assigned.has(depId));
        
        if (allDepsAssigned) {
          ready.add(actionId);
        }
      }
    }
    
    return groups;
  }

  /**
   * Detect cycles in the dependency graph
   */
  _detectCycles(dependencies) {
    // Keep track of visited and currently exploring nodes for DFS
    const visited = new Set();
    const exploring = new Set();
    
    // Run DFS from each node
    for (const [actionId, deps] of dependencies.entries()) {
      if (!visited.has(actionId)) {
        if (this._hasCycle(actionId, dependencies, visited, exploring)) {
          throw new Error(`Cyclic dependency detected involving action ${actionId}`);
        }
      }
    }
  }

  /**
   * Helper for cycle detection using DFS
   */
  _hasCycle(actionId, dependencies, visited, exploring) {
    visited.add(actionId);
    exploring.add(actionId);
    
    const deps = dependencies.get(actionId) || [];
    for (const depId of deps) {
      // If not visited, recurse
      if (!visited.has(depId)) {
        if (this._hasCycle(depId, dependencies, visited, exploring)) {
          return true;
        }
      } 
      // If currently exploring this node, we found a cycle
      else if (exploring.has(depId)) {
        return true;
      }
    }
    
    // Done exploring this node
    exploring.delete(actionId);
    return false;
  }

  /**
   * Ensure the coordinator is initialized
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

module.exports = MultiDomainCoordinator;