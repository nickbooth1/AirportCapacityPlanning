/**
 * Base Domain Adapter
 * 
 * Abstract base class for domain adapters that connect the autonomous
 * orchestration engine to specific airport domains.
 */

const logger = require('../../../utils/logger');

class BaseDomainAdapter {
  constructor(options = {}) {
    if (new.target === BaseDomainAdapter) {
      throw new Error('BaseDomainAdapter is an abstract class and cannot be instantiated directly');
    }
    
    this.options = options;
    this.initialized = false;
    this.domainName = options.domainName || 'unknown';
    this.domainService = options.domainService;
    this.metrics = {
      actionsExecuted: 0,
      actionsSucceeded: 0,
      actionsFailed: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
  }

  /**
   * Initialize the domain adapter
   */
  async initialize() {
    if (this.initialized) return;
    
    logger.info(`Initializing ${this.domainName} domain adapter`);
    
    if (!this.domainService) {
      throw new Error(`Domain service is required for ${this.domainName} adapter`);
    }
    
    // Call domain-specific initialization
    await this._initializeDomain();
    
    this.initialized = true;
    logger.info(`${this.domainName} domain adapter initialized successfully`);
    
    return this;
  }

  /**
   * Translate a generic action to domain-specific format
   */
  async translateAction(action) {
    await this._ensureInitialized();
    
    // Call domain-specific translation
    return this._mapToDomainAction(action);
  }

  /**
   * Execute a domain-specific action
   */
  async executeAction(action) {
    await this._ensureInitialized();
    
    logger.info(`Executing ${this.domainName} action: ${action.type}`);
    
    const startTime = Date.now();
    this.metrics.actionsExecuted++;
    
    try {
      // Translate the action to domain-specific format
      const domainAction = await this.translateAction(action);
      
      // Execute the action through domain service
      const result = await this._executeDomainAction(domainAction);
      
      // Update metrics
      this.metrics.actionsSucceeded++;
      const executionTime = Date.now() - startTime;
      this.metrics.totalExecutionTime += executionTime;
      this.metrics.averageExecutionTime = this.metrics.totalExecutionTime / this.metrics.actionsSucceeded;
      
      // Map domain result to standard format
      return this._mapFromDomainResult(result);
    } catch (error) {
      // Update metrics
      this.metrics.actionsFailed++;
      
      logger.error(`Error executing ${this.domainName} action ${action.type}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate impact of an action on domain metrics
   */
  async calculateImpact(action) {
    await this._ensureInitialized();
    
    // Get current domain state
    const state = await this.getDomainState();
    
    // Calculate domain-specific impact
    return this._calculateDomainImpact(action, state);
  }

  /**
   * Get domain-specific constraints for current state
   */
  async getConstraints() {
    await this._ensureInitialized();
    
    // Get current domain state
    const state = await this.getDomainState();
    
    // Get domain-specific constraints
    return this._getDomainConstraints(state);
  }

  /**
   * Validate if an action is valid in current domain state
   */
  async validateAction(action) {
    await this._ensureInitialized();
    
    // Get current domain state
    const state = await this.getDomainState();
    
    // Get domain constraints
    const constraints = await this.getConstraints();
    
    // Validate action against constraints
    return this._validateActionAgainstConstraints(action, constraints, state);
  }

  /**
   * Get domain-specific metrics
   */
  async getMetrics() {
    await this._ensureInitialized();
    
    // Get adapter metrics
    const adapterMetrics = { ...this.metrics };
    
    // Get domain-specific metrics
    const domainMetrics = await this._getDomainMetrics();
    
    return {
      adapter: adapterMetrics,
      domain: domainMetrics
    };
  }

  /**
   * Get domain-specific state
   */
  async getDomainState() {
    await this._ensureInitialized();
    
    // Get domain-specific state
    const domainState = await this._getDomainState();
    
    return domainState;
  }

  /**
   * Get dependencies for an action
   */
  async getDependencies(action) {
    await this._ensureInitialized();
    
    // Get domain-specific dependencies
    return this._getDomainDependencies(action);
  }

  /**
   * Get timing constraints for an action
   */
  async getTimingConstraints(action) {
    await this._ensureInitialized();
    
    // Get domain-specific timing constraints
    return this._getDomainTimingConstraints(action);
  }

  /**
   * Handle failure of a domain action
   */
  async handleFailure(action, error) {
    await this._ensureInitialized();
    
    // Handle domain-specific failure
    return this._handleDomainFailure(action, error);
  }

  /**
   * Ensure adapter is initialized
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Abstract methods to be implemented by specific adapters
  
  /**
   * Domain-specific initialization
   */
  async _initializeDomain() {
    throw new Error('_initializeDomain() must be implemented by subclass');
  }

  /**
   * Map generic action to domain-specific format
   */
  _mapToDomainAction(action) {
    throw new Error('_mapToDomainAction() must be implemented by subclass');
  }

  /**
   * Execute domain-specific action
   */
  async _executeDomainAction(domainAction) {
    throw new Error('_executeDomainAction() must be implemented by subclass');
  }

  /**
   * Map domain result to standard format
   */
  _mapFromDomainResult(result) {
    throw new Error('_mapFromDomainResult() must be implemented by subclass');
  }

  /**
   * Get domain-specific state
   */
  async _getDomainState() {
    throw new Error('_getDomainState() must be implemented by subclass');
  }

  /**
   * Calculate domain-specific impact
   */
  _calculateDomainImpact(action, state) {
    throw new Error('_calculateDomainImpact() must be implemented by subclass');
  }

  /**
   * Get domain-specific constraints
   */
  _getDomainConstraints(state) {
    throw new Error('_getDomainConstraints() must be implemented by subclass');
  }

  /**
   * Validate action against constraints
   */
  _validateActionAgainstConstraints(action, constraints, state) {
    throw new Error('_validateActionAgainstConstraints() must be implemented by subclass');
  }

  /**
   * Get domain-specific metrics
   */
  async _getDomainMetrics() {
    throw new Error('_getDomainMetrics() must be implemented by subclass');
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
    // Default implementation: no timing constraints
    return null;
  }
  
  /**
   * Handle domain-specific failure
   */
  _handleDomainFailure(action, error) {
    // Default implementation: abort the plan
    return { type: 'ABORT_PLAN', reason: error.message };
  }
}

module.exports = BaseDomainAdapter;