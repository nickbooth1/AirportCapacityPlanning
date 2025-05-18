/**
 * Autonomous Orchestration Engine
 * 
 * Core engine that coordinates all autonomous decision making
 * across the platform. It integrates multiple components including
 * the decision manager, operating mode controller, and domain coordinators.
 */

const logger = require('../../../utils/logger');
const Decision = require('../../../models/Decision');
const SystemState = require('../../../models/SystemState');
const OrchestrationEvent = require('../../../models/OrchestrationEvent');

class AutonomousOrchestrationEngine {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
    
    // Component references to be injected or initialized
    this.decisionManager = options.decisionManager;
    this.operatingModeController = options.operatingModeController;
    this.multiDomainCoordinator = options.multiDomainCoordinator;
    this.riskAnalyzer = options.riskAnalyzer;
    this.optimizationEngine = options.optimizationEngine;
    this.stateStore = options.stateStore;
    this.eventBus = options.eventBus;
    this.domainAdapters = options.domainAdapters || {};
    
    // Metrics
    this.metrics = {
      decisionsCreated: 0,
      decisionsCompleted: 0,
      decisionsFailed: 0,
      decisionsCancelled: 0,
      autonomousDecisions: 0,
      humanApprovedDecisions: 0,
      averageDecisionTime: 0,
      totalDecisionTime: 0
    };
    
    // Bind methods
    this._handleSystemStateChange = this._handleSystemStateChange.bind(this);
    this._handleDecisionEvent = this._handleDecisionEvent.bind(this);
  }

  /**
   * Initialize the orchestration engine
   */
  async initialize() {
    if (this.initialized) return;
    
    logger.info('Initializing Autonomous Orchestration Engine');
    
    // Initialize and validate required components
    if (!this.decisionManager) {
      throw new Error('Decision Manager is required');
    }
    
    if (!this.operatingModeController) {
      throw new Error('Operating Mode Controller is required');
    }
    
    if (!this.multiDomainCoordinator) {
      throw new Error('Multi-Domain Coordinator is required');
    }
    
    // Initialize components if they have initialization
    const componentsToInitialize = [
      this.decisionManager,
      this.operatingModeController,
      this.multiDomainCoordinator,
      this.riskAnalyzer,
      this.optimizationEngine
    ];
    
    for (const component of componentsToInitialize) {
      if (component && typeof component.initialize === 'function') {
        await component.initialize();
      }
    }
    
    // Initialize domain adapters
    for (const [domain, adapter] of Object.entries(this.domainAdapters)) {
      if (adapter && typeof adapter.initialize === 'function') {
        logger.info(`Initializing ${domain} domain adapter`);
        await adapter.initialize();
      }
    }
    
    // Set up event subscriptions
    if (this.eventBus) {
      this.eventBus.subscribe('system.state.changed', this._handleSystemStateChange);
      this.eventBus.subscribe('decision.status.changed', this._handleDecisionEvent);
    }
    
    // Get current system state or initialize if not exists
    await this._ensureSystemState();
    
    this.initialized = true;
    logger.info('Autonomous Orchestration Engine initialized successfully');
    
    // Create an initialization event
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'ENGINE_INITIALIZED',
      source: 'orchestration-engine',
      payload: {
        initialized: true,
        domains: Object.keys(this.domainAdapters),
        operatingMode: await this.operatingModeController.getActiveMode()
      }
    });
    
    return this;
  }

  /**
   * Ensure a valid system state exists
   */
  async _ensureSystemState() {
    const currentState = await SystemState.getMostRecent();
    
    if (!currentState) {
      logger.info('No system state found, initializing with defaults');
      
      // Get active operating mode
      const activeMode = await this.operatingModeController.getActiveMode();
      
      // Create initial system state
      await SystemState.query().insert({
        timestamp: new Date().toISOString(),
        operating_mode_id: activeMode ? activeMode.id : null,
        autonomy_levels: {
          capacity: 'SUPERVISED_AUTONOMOUS',
          passenger: 'HUMAN_APPROVED',
          sustainability: 'SUPERVISED_AUTONOMOUS',
          commercial: 'HUMAN_APPROVED',
          crisis: 'HUMAN_DIRECTED'
        },
        key_metrics: {
          overallCapacityUtilization: 0.75,
          passengerSatisfactionIndex: 4.0,
          sustainabilityScore: 80,
          commercialPerformance: 0.85,
          safetyIndex: 0.98
        },
        active_processes: [],
        situational_assessment: {
          currentState: 'NORMAL_OPERATIONS',
          riskLevel: 'LOW',
          activeChallenges: []
        },
        resource_status: {
          stands: { availability: 0.95, utilization: 0.75, health: 1.0 },
          terminals: { availability: 1.0, utilization: 0.68, health: 0.98 },
          runways: { availability: 1.0, utilization: 0.72, health: 1.0 }
        }
      });
    }
  }

  /**
   * Handle system state changes
   */
  async _handleSystemStateChange(event) {
    logger.debug('System state changed', { stateId: event.currentState.id });
    
    // Re-evaluate any pending decisions based on new state
    await this._reevaluatePendingDecisions();
    
    // Check if operating mode transition is needed
    const currentMode = await this.operatingModeController.getActiveMode();
    const transitionResult = await this.operatingModeController.evaluateTransitionCriteria();
    
    if (transitionResult.shouldTransition && transitionResult.targetMode) {
      logger.info('Operating mode transition triggered', {
        from: currentMode ? currentMode.name : 'None',
        to: transitionResult.targetMode.name,
        reason: transitionResult.reason
      });
      
      await this.operatingModeController.transitionToMode(transitionResult.targetMode.id);
    }
  }

  /**
   * Handle decision events
   */
  async _handleDecisionEvent(event) {
    const { decisionId, oldStatus, newStatus } = event.payload;
    
    // Update metrics
    if (newStatus === 'COMPLETED') {
      this.metrics.decisionsCompleted++;
      
      // Update average decision time
      const decision = await Decision.query().findById(decisionId);
      if (decision && decision.initiated_at && decision.completed_at) {
        const decisionTime = new Date(decision.completed_at) - new Date(decision.initiated_at);
        this.metrics.totalDecisionTime += decisionTime;
        this.metrics.averageDecisionTime = this.metrics.totalDecisionTime / this.metrics.decisionsCompleted;
      }
    } else if (newStatus === 'FAILED') {
      this.metrics.decisionsFailed++;
    } else if (newStatus === 'CANCELED') {
      this.metrics.decisionsCancelled++;
    }
    
    // Update system state with active processes
    await this._updateSystemStateActiveProcesses();
  }

  /**
   * Re-evaluate pending decisions based on current state
   */
  async _reevaluatePendingDecisions() {
    const pendingDecisions = await Decision.query()
      .where('status', 'PROPOSED')
      .orderBy('priority', 'desc');
    
    for (const decision of pendingDecisions) {
      // Check if decision can be auto-approved based on current operating mode
      const canAutoApprove = await this._canAutoApproveDecision(decision);
      
      if (canAutoApprove) {
        logger.info(`Auto-approving decision ${decision.id} based on current operating mode`);
        
        await this.decisionManager.approveDecision(decision.id, {
          approvedBy: 'autonomous-system',
          notes: 'Auto-approved based on operating mode and confidence threshold'
        });
        
        this.metrics.autonomousDecisions++;
      }
    }
  }

  /**
   * Update system state with current active processes
   */
  async _updateSystemStateActiveProcesses() {
    // Get executing decisions
    const executingDecisions = await Decision.query()
      .where('status', 'EXECUTING');
    
    // Format as active processes
    const activeProcesses = await Promise.all(executingDecisions.map(async (decision) => {
      const progress = await decision.getExecutionProgress();
      
      // Estimate completion time
      const completionEstimate = new Date();
      // Simple estimation based on progress, would be more sophisticated in production
      const remainingTimeMs = progress < 10 ? 600000 : // 10 minutes if just started
                              progress < 50 ? 300000 : // 5 minutes if under halfway
                              progress < 90 ? 120000 : // 2 minutes if most done
                                             30000;   // 30 seconds if almost done
      
      completionEstimate.setTime(completionEstimate.getTime() + remainingTimeMs);
      
      return {
        id: decision.id,
        type: decision.type,
        status: 'in_progress',
        completion: progress,
        estimatedCompletion: completionEstimate.toISOString()
      };
    }));
    
    // Update the system state
    const currentState = await SystemState.getMostRecent();
    
    if (currentState) {
      await SystemState.query().insert({
        timestamp: new Date().toISOString(),
        operating_mode_id: currentState.operating_mode_id,
        autonomy_levels: currentState.autonomy_levels,
        key_metrics: currentState.key_metrics,
        active_processes: activeProcesses,
        situational_assessment: currentState.situational_assessment,
        resource_status: currentState.resource_status
      });
    }
  }

  /**
   * Determine if a decision can be automatically approved
   */
  async _canAutoApproveDecision(decision) {
    // Get current operating mode
    const activeMode = await this.operatingModeController.getActiveMode();
    if (!activeMode) return false;
    
    // Get the autonomy level for the decision's domain
    const domain = this._determinePrimaryDomain(decision);
    const autonomyLevel = await this._getAutonomyLevelForDomain(domain);
    
    // Check if the domain allows autonomous decisions
    if (autonomyLevel !== 'FULLY_AUTONOMOUS' && autonomyLevel !== 'SUPERVISED_AUTONOMOUS') {
      return false;
    }
    
    // Check if the decision meets confidence threshold
    const { requiredConfidenceScore, maxAcceptableRisk } = activeMode.decision_thresholds;
    
    if (decision.confidence < requiredConfidenceScore) {
      return false;
    }
    
    if (decision.risk > maxAcceptableRisk) {
      return false;
    }
    
    // Check domain-specific thresholds if defined
    const domainThresholdKey = `${domain.toLowerCase()}MinimumScore`;
    if (activeMode.decision_thresholds[domainThresholdKey]) {
      const domainImpactKey = `${domain.toLowerCase()}Impact`;
      const domainImpact = decision.impact_assessment[domainImpactKey];
      
      if (domainImpact && domainImpact.score < activeMode.decision_thresholds[domainThresholdKey]) {
        return false;
      }
    }
    
    // All checks passed
    return true;
  }

  /**
   * Determine the primary domain for a decision
   */
  _determinePrimaryDomain(decision) {
    // For now, simply use the first action's domain or a default
    if (decision.actions && decision.actions.length > 0) {
      return decision.actions[0].domain;
    }
    
    // Fallback logic based on decision type
    const typeToDefaultDomain = {
      'CAPACITY_ADJUSTMENT': 'CAPACITY',
      'STAND_ALLOCATION': 'CAPACITY',
      'PASSENGER_FLOW_OPTIMIZATION': 'PASSENGER',
      'RESOURCE_SCHEDULING': 'CAPACITY',
      'SUSTAINABILITY_OPTIMIZATION': 'SUSTAINABILITY',
      'COMMERCIAL_PROMOTION': 'COMMERCIAL',
      'CRISIS_RESPONSE': 'CRISIS'
    };
    
    return typeToDefaultDomain[decision.type] || 'CAPACITY';
  }

  /**
   * Get the current autonomy level for a domain
   */
  async _getAutonomyLevelForDomain(domain) {
    const currentState = await SystemState.getMostRecent();
    
    if (!currentState || !currentState.autonomy_levels) {
      return 'HUMAN_APPROVED'; // Default to requiring approval
    }
    
    return currentState.autonomy_levels[domain.toLowerCase()] || 'HUMAN_APPROVED';
  }

  /**
   * Create a new decision
   */
  async createDecision(decisionData) {
    await this._ensureInitialized();
    
    // Map from API format to internal format if needed
    const internalDecisionData = this._mapToInternalDecisionFormat(decisionData);
    
    // Get current operating mode
    const activeMode = await this.operatingModeController.getActiveMode();
    if (activeMode) {
      internalDecisionData.operating_mode_id = activeMode.id;
    }
    
    // Create the decision through the decision manager
    const decision = await this.decisionManager.createDecision(internalDecisionData);
    
    this.metrics.decisionsCreated++;
    
    // Process the decision
    await this.processDecision(decision.id);
    
    return decision;
  }

  /**
   * Process a decision
   */
  async processDecision(decisionId) {
    await this._ensureInitialized();
    
    // Get the decision
    const decision = await Decision.query().findById(decisionId);
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }
    
    // Check if decision needs approval
    const requiresApproval = await this.decisionManager.requiresApproval(decision);
    
    if (requiresApproval) {
      logger.info(`Decision ${decisionId} requires approval`);
      // Approval request will be handled by the decision manager
      await this.decisionManager.requestApproval(decisionId);
    } else {
      // Auto-approve the decision
      logger.info(`Auto-approving decision ${decisionId}`);
      await this.decisionManager.approveDecision(decisionId, {
        approvedBy: 'autonomous-system',
        notes: 'Auto-approved based on operating mode and confidence threshold'
      });
      
      this.metrics.autonomousDecisions++;
    }
    
    // After approval (either auto or human), the decision manager will execute the decision
    
    return decision;
  }

  /**
   * Execute a decision
   */
  async executeDecision(decisionId) {
    await this._ensureInitialized();
    
    // This method is typically called by the decision manager after approval
    return this.decisionManager.executeDecision(decisionId);
  }

  /**
   * Map API decision format to internal format
   */
  _mapToInternalDecisionFormat(decisionData) {
    // Handle any format conversion between API and internal models
    // This is a simplified version - expand based on actual API format
    return {
      type: decisionData.type,
      description: decisionData.description,
      priority: decisionData.priority || 'MEDIUM',
      confidence: decisionData.confidence || 0.8,
      risk: decisionData.risk || 0.2,
      impact_assessment: decisionData.impactAssessment || {
        operationalImpact: {},
        passengerImpact: {},
        sustainabilityImpact: {},
        commercialImpact: {}
      },
      domain_details: decisionData.domainDetails || {},
      requested_by: decisionData.requestedBy || 'system',
      tags: decisionData.tags || [],
      notes: decisionData.notes || []
    };
  }

  /**
   * Ensure engine is initialized
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get current system state
   */
  async getSystemState() {
    await this._ensureInitialized();
    return SystemState.getMostRecent();
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Update a domain's autonomy level
   */
  async updateAutonomyLevel(domain, level) {
    await this._ensureInitialized();
    
    const validLevels = [
      'FULLY_AUTONOMOUS', 
      'SUPERVISED_AUTONOMOUS', 
      'HUMAN_APPROVED', 
      'HUMAN_DIRECTED',
      'MANUAL'
    ];
    
    if (!validLevels.includes(level)) {
      throw new Error(`Invalid autonomy level: ${level}. Must be one of: ${validLevels.join(', ')}`);
    }
    
    // Get current state
    const currentState = await SystemState.getMostRecent();
    
    if (!currentState) {
      throw new Error('No system state found');
    }
    
    // Create new state with updated autonomy level
    const autonomyLevels = { ...currentState.autonomy_levels };
    autonomyLevels[domain.toLowerCase()] = level;
    
    await SystemState.query().insert({
      timestamp: new Date().toISOString(),
      operating_mode_id: currentState.operating_mode_id,
      autonomy_levels: autonomyLevels,
      key_metrics: currentState.key_metrics,
      active_processes: currentState.active_processes,
      situational_assessment: currentState.situational_assessment,
      resource_status: currentState.resource_status
    });
    
    // Create an event for the autonomy level change
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'AUTONOMY_LEVEL_CHANGED',
      source: 'orchestration-engine',
      payload: {
        domain,
        oldLevel: currentState.autonomy_levels[domain.toLowerCase()],
        newLevel: level
      }
    });
    
    return autonomyLevels;
  }
}

module.exports = AutonomousOrchestrationEngine;