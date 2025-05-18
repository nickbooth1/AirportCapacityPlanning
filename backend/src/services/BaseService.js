/**
 * Base Service
 * 
 * Abstract base class for all services using dependency injection
 * Provides common functionality and a consistent pattern for service implementation
 */

const logger = require('../utils/logger');

class BaseService {
  /**
   * Create an instance of the service
   * Dependencies should be injected through constructor parameters
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.logger = options.logger || logger;
    this.initialized = false;
    this.metrics = {
      errors: 0,
      successfulOperations: 0,
      lastOperationTime: null,
      averageOperationTime: 0,
      totalOperationTime: 0,
      totalOperations: 0
    };
  }
  
  /**
   * Initialize the service
   * Override in derived classes to perform initialization
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      await this._initializeService();
      this.initialized = true;
      this.logger.debug(`${this.constructor.name} initialized`);
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`Failed to initialize ${this.constructor.name}: ${error.message}`, {
        error: error.stack
      });
      throw error;
    }
  }
  
  /**
   * Internal initialization method
   * Override in derived classes
   * 
   * @protected
   * @returns {Promise<void>}
   */
  async _initializeService() {
    // Default implementation does nothing
  }
  
  /**
   * Track operation metrics
   * 
   * @protected
   * @param {function} operation - The operation function to track
   * @param {Array} args - Arguments to pass to the operation
   * @returns {Promise<any>} - Result of the operation
   */
  async _trackOperation(operation, ...args) {
    const startTime = Date.now();
    try {
      const result = await operation(...args);
      this.metrics.successfulOperations++;
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.metrics.lastOperationTime = duration;
      this.metrics.totalOperationTime += duration;
      this.metrics.totalOperations++;
      this.metrics.averageOperationTime = this.metrics.totalOperationTime / this.metrics.totalOperations;
    }
  }
  
  /**
   * Ensure the service is initialized
   * 
   * @protected
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
  
  /**
   * Get service metrics
   * 
   * @returns {Object} - Service metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Reset service metrics
   */
  resetMetrics() {
    this.metrics = {
      errors: 0,
      successfulOperations: 0,
      lastOperationTime: null,
      averageOperationTime: 0,
      totalOperationTime: 0,
      totalOperations: 0
    };
  }
  
  /**
   * Check if service is healthy
   * 
   * @returns {boolean} - Whether the service is healthy
   */
  isHealthy() {
    return this.initialized;
  }
  
  /**
   * Get service health details
   * 
   * @returns {Object} - Service health details
   */
  getHealthDetails() {
    return {
      serviceName: this.constructor.name,
      initialized: this.initialized,
      errorCount: this.metrics.errors,
      averageOperationTime: this.metrics.averageOperationTime,
      lastOperationTime: this.metrics.lastOperationTime
    };
  }
}

module.exports = BaseService;