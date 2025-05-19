/**
 * Operating Mode Controller
 * 
 * Manages the active operating mode of the autonomous system,
 * handling transitions between modes and applying mode-specific settings.
 */

const logger = require('../../../utils/logger');
const OperatingMode = require('../../../models/OperatingMode');
const SystemState = require('../../../models/SystemState');
const OrchestrationEvent = require('../../../models/OrchestrationEvent');
const cronParser = require('cron-parser');

class OperatingModeController {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
    this.eventBus = options.eventBus;
    
    // Cache for active mode
    this.activeMode = null;
    this.lastModeCheck = null;
    
    // Mode transition lock flag
    this.isTransitioning = false;
    
    // Bind event handlers
    this._handleExternalEvent = this._handleExternalEvent.bind(this);
  }

  /**
   * Initialize the controller
   */
  async initialize() {
    if (this.initialized) return;
    
    logger.info('Initializing Operating Mode Controller');
    
    // Set up event subscriptions if event bus is available
    if (this.eventBus) {
      this.eventBus.subscribe('*', this._handleExternalEvent);
    }
    
    // Load active mode
    await this.getActiveMode(true);
    
    // Initialize default mode if no active mode exists
    if (!this.activeMode) {
      logger.info('No active operating mode found, initializing default mode');
      await this._initializeDefaultMode();
    }
    
    // Start automatic evaluation timer
    if (this.options.enableAutoEvaluation !== false) {
      this._startAutoEvaluation();
    }
    
    this.initialized = true;
    logger.info('Operating Mode Controller initialized successfully');
    
    return this;
  }

  /**
   * Create a new operating mode
   */
  async createMode(modeData) {
    // Ensure normalized format
    const normalizedData = this._normalizeOperatingMode(modeData);
    
    // Create the mode
    const mode = await OperatingMode.query().insert(normalizedData);
    
    logger.info(`Created new operating mode: ${mode.name}`);
    
    // Create an event for the new mode
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'OPERATING_MODE_CREATED',
      source: 'operating-mode-controller',
      related_entity_id: mode.id,
      related_entity_type: 'OPERATING_MODE',
      payload: {
        name: mode.name,
        priority_weights: mode.priority_weights
      }
    });
    
    return mode;
  }

  /**
   * Update an existing operating mode
   */
  async updateMode(modeId, updates) {
    // Check if mode exists
    const existingMode = await OperatingMode.query().findById(modeId);
    if (!existingMode) {
      throw new Error(`Operating mode with ID ${modeId} not found`);
    }
    
    // Normalize updates
    const normalizedUpdates = {};
    if (updates.name) normalizedUpdates.name = updates.name;
    if (updates.description) normalizedUpdates.description = updates.description;
    if (updates.priority_weights) normalizedUpdates.priority_weights = updates.priority_weights;
    if (updates.decision_thresholds) normalizedUpdates.decision_thresholds = updates.decision_thresholds;
    if (updates.activation_criteria) normalizedUpdates.activation_criteria = updates.activation_criteria;
    if (updates.constraints) normalizedUpdates.constraints = updates.constraints;
    if (updates.updated_by) normalizedUpdates.updated_by = updates.updated_by;
    
    // Verify priority weights sum to 1 if updating them
    if (normalizedUpdates.priority_weights) {
      const { operationalEfficiency, passengerExperience, sustainability, commercialPerformance } = 
        normalizedUpdates.priority_weights;
      
      const sum = operationalEfficiency + passengerExperience + sustainability + commercialPerformance;
      if (Math.abs(sum - 1) > 0.001) {
        throw new Error('Priority weights must sum to 1');
      }
    }
    
    // Update the mode
    const updatedMode = await OperatingMode.query()
      .patchAndFetchById(modeId, normalizedUpdates);
    
    logger.info(`Updated operating mode: ${updatedMode.name}`);
    
    // If updating the active mode, refresh cache
    if (this.activeMode && this.activeMode.id === modeId) {
      this.activeMode = updatedMode;
    }
    
    // Create an event for the updated mode
    await OrchestrationEvent.query().insert({
      timestamp: new Date().toISOString(),
      event_type: 'OPERATING_MODE_UPDATED',
      source: 'operating-mode-controller',
      related_entity_id: updatedMode.id,
      related_entity_type: 'OPERATING_MODE',
      payload: {
        name: updatedMode.name,
        changes: Object.keys(normalizedUpdates)
      }
    });
    
    return updatedMode;
  }

  /**
   * Activate a specific operating mode
   */
  async activateMode(modeId) {
    // Check if mode exists
    const mode = await OperatingMode.query().findById(modeId);
    if (!mode) {
      throw new Error(`Operating mode with ID ${modeId} not found`);
    }
    
    // Get current active mode
    const currentActive = await this.getActiveMode(true);
    
    // Begin transition
    return this.transitionToMode(modeId);
  }

  /**
   * Get the currently active operating mode
   */
  async getActiveMode(forceRefresh = false) {
    // Return cached mode if available and not force refreshing
    const now = new Date();
    if (!forceRefresh && this.activeMode && this.lastModeCheck && 
        (now - this.lastModeCheck) < 60000) { // 1 minute cache
      return this.activeMode;
    }
    
    // Query for active mode
    const activeMode = await OperatingMode.query()
      .where('is_active', true)
      .orderBy('updated_at', 'desc')
      .first();
    
    this.activeMode = activeMode;
    this.lastModeCheck = now;
    
    return activeMode;
  }

  /**
   * Check if a mode transition should occur based on criteria
   */
  async evaluateTransitionCriteria() {
    // Get current active mode
    const activeMode = await this.getActiveMode();
    
    // Return early if already transitioning
    if (this.isTransitioning) {
      return {
        shouldTransition: false,
        reason: 'Already transitioning between modes'
      };
    }
    
    // If no active mode, activate the default
    if (!activeMode) {
      const defaultMode = await this._getDefaultMode();
      return {
        shouldTransition: true,
        targetMode: defaultMode,
        reason: 'No active mode, activating default'
      };
    }
    
    // Check if any other mode should be activated based on their criteria
    const modes = await OperatingMode.query()
      .where('id', '!=', activeMode.id)
      .where('is_active', false);
    
    // Get current time and system state
    const now = new Date();
    const systemState = await SystemState.getMostRecent();
    
    // Evaluate each mode's activation criteria
    for (const mode of modes) {
      if (!mode.activation_criteria) continue;
      
      // Check time-based triggers
      if (mode.activation_criteria.timeBasedTriggers && 
          this._evaluateTimeBasedTriggers(mode.activation_criteria.timeBasedTriggers, now)) {
        return {
          shouldTransition: true,
          targetMode: mode,
          reason: 'Time-based trigger activated'
        };
      }
      
      // Check event-based triggers
      // This is a placeholder for more sophisticated event evaluation
      if (mode.activation_criteria.eventBasedTriggers && 
          systemState && this._evaluateEventBasedTriggers(
            mode.activation_criteria.eventBasedTriggers, 
            systemState
          )) {
        return {
          shouldTransition: true,
          targetMode: mode,
          reason: 'Event-based trigger activated'
        };
      }
    }
    
    // No transition needed
    return {
      shouldTransition: false
    };
  }

  /**
   * Transition between operating modes
   */
  async transitionToMode(targetModeId) {
    // Get target mode
    const targetMode = await OperatingMode.query().findById(targetModeId);
    if (!targetMode) {
      throw new Error(`Operating mode with ID ${targetModeId} not found`);
    }
    
    // Get current active mode
    const currentMode = await this.getActiveMode(true);
    
    // If already active, just return
    if (currentMode && currentMode.id === targetModeId) {
      return {
        success: true,
        message: 'Mode is already active',
        mode: currentMode
      };
    }
    
    // Set transition lock
    if (this.isTransitioning) {
      throw new Error('Another mode transition is already in progress');
    }
    
    this.isTransitioning = true;
    
    try {
      logger.info(`Beginning transition to mode: ${targetMode.name}`);
      
      // Create pre-transition event
      await OrchestrationEvent.query().insert({
        timestamp: new Date().toISOString(),
        event_type: 'OPERATING_MODE_TRANSITION_STARTED',
        source: 'operating-mode-controller',
        related_entity_id: targetMode.id,
        related_entity_type: 'OPERATING_MODE',
        payload: {
          fromMode: currentMode ? currentMode.name : null,
          toMode: targetMode.name
        }
      });
      
      // Deactivate current mode
      if (currentMode) {
        await OperatingMode.query()
          .findById(currentMode.id)
          .patch({ is_active: false });
      }
      
      // Activate target mode
      await OperatingMode.query()
        .findById(targetMode.id)
        .patch({ is_active: true });
      
      // Apply mode settings
      await this.applyModeSettings(targetMode.id);
      
      // Get updated system state
      const systemState = await SystemState.getMostRecent();
      
      // Create new system state with updated mode
      await SystemState.query().insert({
        timestamp: new Date().toISOString(),
        operating_mode_id: targetMode.id,
        autonomy_levels: systemState ? systemState.autonomy_levels : {
          capacity: 'SUPERVISED_AUTONOMOUS',
          passenger: 'HUMAN_APPROVED',
          sustainability: 'SUPERVISED_AUTONOMOUS',
          commercial: 'HUMAN_APPROVED',
          crisis: 'HUMAN_DIRECTED'
        },
        key_metrics: systemState ? systemState.key_metrics : {
          overallCapacityUtilization: 0.75,
          passengerSatisfactionIndex: 4.0,
          sustainabilityScore: 80,
          commercialPerformance: 0.85,
          safetyIndex: 0.98
        },
        active_processes: systemState ? systemState.active_processes : [],
        situational_assessment: systemState ? systemState.situational_assessment : {
          currentState: 'NORMAL_OPERATIONS',
          riskLevel: 'LOW',
          activeChallenges: []
        },
        resource_status: systemState ? systemState.resource_status : {}
      });
      
      // Refresh active mode cache
      this.activeMode = await OperatingMode.query().findById(targetMode.id);
      this.lastModeCheck = new Date();
      
      // Create post-transition event
      await OrchestrationEvent.query().insert({
        timestamp: new Date().toISOString(),
        event_type: 'OPERATING_MODE_TRANSITION_COMPLETED',
        source: 'operating-mode-controller',
        related_entity_id: targetMode.id,
        related_entity_type: 'OPERATING_MODE',
        payload: {
          fromMode: currentMode ? currentMode.name : null,
          toMode: targetMode.name,
          success: true
        }
      });
      
      logger.info(`Completed transition to mode: ${targetMode.name}`);
      
      return {
        success: true,
        message: 'Mode transition completed successfully',
        mode: targetMode
      };
    } catch (error) {
      logger.error(`Mode transition failed: ${error.message}`, { error });
      
      // Create transition failure event
      await OrchestrationEvent.query().insert({
        timestamp: new Date().toISOString(),
        event_type: 'OPERATING_MODE_TRANSITION_FAILED',
        source: 'operating-mode-controller',
        related_entity_id: targetMode.id,
        related_entity_type: 'OPERATING_MODE',
        payload: {
          fromMode: currentMode ? currentMode.name : null,
          toMode: targetMode.name,
          error: error.message
        }
      });
      
      throw error;
    } finally {
      // Release transition lock
      this.isTransitioning = false;
    }
  }

  /**
   * Apply mode-specific settings to system components
   */
  async applyModeSettings(modeId) {
    // Get the mode
    const mode = await OperatingMode.query().findById(modeId);
    if (!mode) {
      throw new Error(`Operating mode with ID ${modeId} not found`);
    }
    
    logger.info(`Applying settings for mode: ${mode.name}`);
    
    // Publish the mode change to the event bus if available
    if (this.eventBus) {
      await this.eventBus.publish('operating.mode.changed', {
        modeId: mode.id,
        modeName: mode.name,
        priorityWeights: mode.priority_weights,
        decisionThresholds: mode.decision_thresholds
      });
    }
    
    // Return the applied settings
    return {
      priorityWeights: mode.priority_weights,
      decisionThresholds: mode.decision_thresholds,
      constraints: mode.constraints
    };
  }

  /**
   * Get priority weights for the current operating mode
   */
  async getCurrentPriorityWeights() {
    const mode = await this.getActiveMode();
    return mode ? mode.priority_weights : null;
  }

  /**
   * Handle external events that might trigger mode transitions
   */
  async _handleExternalEvent(event) {
    // Skip if already transitioning
    if (this.isTransitioning) return;
    
    // Get active mode
    const activeMode = await this.getActiveMode();
    if (!activeMode) return;
    
    // Skip if no event-based triggers
    if (!activeMode.activation_criteria || 
        !activeMode.activation_criteria.eventBasedTriggers ||
        !activeMode.activation_criteria.eventBasedTriggers.length) {
      return;
    }
    
    // Get all modes
    const allModes = await OperatingMode.query();
    
    // Check if any other mode should be activated based on this event
    for (const mode of allModes) {
      if (mode.id === activeMode.id || !mode.activation_criteria) continue;
      
      const eventTriggers = mode.activation_criteria.eventBasedTriggers || [];
      
      if (eventTriggers.includes(event.type)) {
        logger.info(`Event ${event.type} triggered mode transition to ${mode.name}`);
        
        // Trigger mode transition
        try {
          await this.transitionToMode(mode.id);
        } catch (error) {
          logger.error(`Failed to transition to mode ${mode.name}: ${error.message}`);
        }
        
        // Only transition to one mode
        break;
      }
    }
  }

  /**
   * Evaluate time-based triggers
   */
  _evaluateTimeBasedTriggers(triggers, currentTime) {
    if (!triggers || !triggers.length) return false;
    
    for (const trigger of triggers) {
      // Handle daily time range format like "daily: 10:00-16:00"
      if (trigger.startsWith('daily:')) {
        const timeRange = trigger.substring(7).trim();
        const [startTimeStr, endTimeStr] = timeRange.split('-');
        
        if (startTimeStr && endTimeStr) {
          const [startHour, startMinute] = startTimeStr.trim().split(':').map(Number);
          const [endHour, endMinute] = endTimeStr.trim().split(':').map(Number);
          
          const now = currentTime || new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          // Convert to minutes for easier comparison
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;
          const currentTotalMinutes = currentHour * 60 + currentMinute;
          
          // Check if current time is within range
          if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes) {
            return true;
          }
        }
      }
      // Handle cron expressions
      else if (trigger.includes('*') || /^\d+\s+\d+/.test(trigger)) {
        try {
          const interval = cronParser.parseExpression(trigger);
          const prev = interval.prev();
          const next = interval.next();
          
          // If the current time is within 1 minute of a scheduled time, consider it triggered
          const now = currentTime || new Date();
          const diffToPrev = Math.abs(now - prev.toDate());
          const diffToNext = Math.abs(now - next.toDate());
          
          if (diffToPrev < 60000 || diffToNext < 60000) {
            return true;
          }
        } catch (err) {
          logger.warn(`Invalid cron expression in trigger: ${trigger}`);
        }
      }
    }
    
    return false;
  }

  /**
   * Evaluate event-based triggers
   */
  _evaluateEventBasedTriggers(triggers, systemState) {
    if (!triggers || !triggers.length || !systemState) return false;
    
    // This is a simplified implementation - in production, this would be more sophisticated
    // and would analyze the system state in depth
    
    // Check for specific system conditions
    for (const trigger of triggers) {
      // Air quality alert trigger
      if (trigger === 'air_quality_alert' && 
          systemState.situational_assessment &&
          systemState.situational_assessment.activeChallenges) {
        
        const hasAirQualityIssue = systemState.situational_assessment.activeChallenges.some(
          challenge => challenge.type === 'air_quality' || challenge.type === 'environmental'
        );
        
        if (hasAirQualityIssue) return true;
      }
      
      // Energy demand peak trigger
      if (trigger === 'energy_demand_peak' &&
          systemState.key_metrics &&
          systemState.key_metrics.energyConsumption > 0.85) {
        return true;
      }
      
      // Weather event trigger
      if (trigger === 'weather_event' &&
          systemState.situational_assessment &&
          systemState.situational_assessment.activeChallenges) {
        
        const hasWeatherIssue = systemState.situational_assessment.activeChallenges.some(
          challenge => challenge.type === 'weather' || 
                       challenge.type === 'storm' || 
                       challenge.type === 'snow'
        );
        
        if (hasWeatherIssue) return true;
      }
      
      // High passenger volume trigger
      if (trigger === 'high_passenger_volume' &&
          systemState.key_metrics &&
          systemState.key_metrics.passengerVolume > 0.9) {
        return true;
      }
      
      // Risk level trigger
      if (trigger === 'elevated_risk' &&
          systemState.situational_assessment &&
          (systemState.situational_assessment.riskLevel === 'HIGH' || 
           systemState.situational_assessment.riskLevel === 'SEVERE')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Start automatic evaluation timer
   */
  _startAutoEvaluation() {
    const interval = this.options.evaluationInterval || 60000; // Default: 1 minute
    
    // Clear any existing timer
    if (this._evaluationTimer) {
      clearInterval(this._evaluationTimer);
    }
    
    // Set up periodic evaluation
    this._evaluationTimer = setInterval(async () => {
      try {
        const evaluation = await this.evaluateTransitionCriteria();
        
        if (evaluation.shouldTransition && evaluation.targetMode) {
          logger.info(`Auto evaluation triggered mode transition to ${evaluation.targetMode.name}`, {
            reason: evaluation.reason
          });
          
          await this.transitionToMode(evaluation.targetMode.id);
        }
      } catch (error) {
        logger.error('Error in automatic mode evaluation', { error: error.message });
      }
    }, interval);
    
    logger.info(`Started automatic mode evaluation with interval ${interval}ms`);
  }

  /**
   * Initialize default operating mode if none exists
   */
  async _initializeDefaultMode() {
    const defaultMode = await this._getDefaultMode();
    
    if (!defaultMode) {
      // Create default mode
      const normalMode = await this.createMode({
        name: 'Normal Operations',
        description: 'Standard operating mode balancing all priorities',
        priority_weights: {
          operationalEfficiency: 0.35,
          passengerExperience: 0.3,
          sustainability: 0.2,
          commercialPerformance: 0.15
        },
        decision_thresholds: {
          requiredConfidenceScore: 0.7,
          maxAcceptableRisk: 0.3,
          capacityMinimumScore: 0.6,
          passengerMinimumScore: 0.6,
          sustainabilityMinimumScore: 0.5,
          commercialMinimumScore: 0.5
        },
        activation_criteria: {
          timeBasedTriggers: ['daily: 08:00-22:00'],
          manualActivation: true
        },
        is_active: true,
        created_by: 'system'
      });
      
      // Create sustainability-focused mode
      await this.createMode({
        name: 'Sustainability Priority',
        description: 'Operating mode that prioritizes environmental metrics',
        priority_weights: {
          operationalEfficiency: 0.3,
          passengerExperience: 0.2,
          sustainability: 0.4,
          commercialPerformance: 0.1
        },
        decision_thresholds: {
          requiredConfidenceScore: 0.75,
          maxAcceptableRisk: 0.25,
          sustainabilityMinimumScore: 0.7
        },
        activation_criteria: {
          timeBasedTriggers: ['daily: 10:00-16:00'],
          eventBasedTriggers: ['air_quality_alert', 'energy_demand_peak'],
          manualActivation: true
        },
        created_by: 'system'
      });
      
      // Create passenger-focused mode
      await this.createMode({
        name: 'Passenger Priority',
        description: 'Operating mode that prioritizes passenger experience',
        priority_weights: {
          operationalEfficiency: 0.25,
          passengerExperience: 0.5,
          sustainability: 0.15,
          commercialPerformance: 0.1
        },
        decision_thresholds: {
          requiredConfidenceScore: 0.8,
          maxAcceptableRisk: 0.2,
          passengerMinimumScore: 0.75
        },
        activation_criteria: {
          eventBasedTriggers: ['high_passenger_volume'],
          manualActivation: true
        },
        created_by: 'system'
      });
      
      // Create efficiency-focused mode
      await this.createMode({
        name: 'Efficiency Priority',
        description: 'Operating mode that prioritizes operational efficiency',
        priority_weights: {
          operationalEfficiency: 0.5,
          passengerExperience: 0.2,
          sustainability: 0.15,
          commercialPerformance: 0.15
        },
        decision_thresholds: {
          requiredConfidenceScore: 0.65,
          maxAcceptableRisk: 0.35,
          capacityMinimumScore: 0.7
        },
        activation_criteria: {
          eventBasedTriggers: ['operational_pressure'],
          manualActivation: true
        },
        created_by: 'system'
      });
      
      logger.info('Created default operating modes');
      
      return normalMode;
    }
    
    // Activate the default mode
    await this.activateMode(defaultMode.id);
    
    return defaultMode;
  }

  /**
   * Get the default operating mode
   */
  async _getDefaultMode() {
    return OperatingMode.query()
      .where('name', 'Normal Operations')
      .first();
  }

  /**
   * Normalize operating mode data
   */
  _normalizeOperatingMode(modeData) {
    const normalizedData = { ...modeData };
    
    // Ensure priority weights are normalized to sum to 1
    if (normalizedData.priority_weights) {
      const { operationalEfficiency, passengerExperience, sustainability, commercialPerformance } = 
        normalizedData.priority_weights;
      
      const sum = operationalEfficiency + passengerExperience + sustainability + commercialPerformance;
      
      if (Math.abs(sum - 1) > 0.001) {
        logger.warn(`Priority weights sum (${sum}) is not 1, normalizing`);
        
        // Normalize the weights
        normalizedData.priority_weights.operationalEfficiency = operationalEfficiency / sum;
        normalizedData.priority_weights.passengerExperience = passengerExperience / sum;
        normalizedData.priority_weights.sustainability = sustainability / sum;
        normalizedData.priority_weights.commercialPerformance = commercialPerformance / sum;
      }
    }
    
    return normalizedData;
  }
}

module.exports = OperatingModeController;