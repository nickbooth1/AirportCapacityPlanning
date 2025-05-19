/**
 * Base NLP Processor
 * 
 * This class serves as the foundation for all NLP processing components in the system.
 * It provides common functionality and interfaces that all NLP processors should implement.
 */

const { performance } = require('perf_hooks');
const logger = require('../../../utils/logger');

class NLPProcessorBase {
  /**
   * Create a new NLP processor
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the processor
   */
  constructor(services = {}, options = {}) {
    this.services = services;
    this.options = options;
    
    // Set up logging
    this.logger = services.logger || logger;
    
    // Flag for enabling performance metrics
    this.enableMetrics = options.enableMetrics !== undefined ? options.enableMetrics : true;
    
    // Configuration
    this.confidence = {
      threshold: options.confidenceThreshold || 0.7,
      highThreshold: options.highConfidenceThreshold || 0.9,
      lowThreshold: options.lowConfidenceThreshold || 0.5
    };
    
    // Initialize counters for metrics
    this.metrics = {
      processed: 0,
      successful: 0,
      failed: 0,
      processingTimeMs: 0
    };
  }
  
  /**
   * Process a text input
   * Must be implemented by subclasses
   * 
   * @param {string} text - The text to process
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - The processing result
   */
  async process(text, context = {}) {
    throw new Error('Method process() must be implemented by subclass');
  }
  
  /**
   * Track performance metrics for a processing operation
   * 
   * @param {Function} processingFn - The async function to measure
   * @param {string} operationName - Name of the operation (for logging)
   * @returns {Promise<*>} - The result of the processing function
   */
  async trackPerformance(processingFn, operationName = 'processing') {
    if (!this.enableMetrics) {
      return processingFn();
    }
    
    const startTime = performance.now();
    let success = false;
    
    try {
      const result = await processingFn();
      success = true;
      return result;
    } finally {
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      // Update metrics
      this.metrics.processed += 1;
      this.metrics.processingTimeMs += durationMs;
      
      if (success) {
        this.metrics.successful += 1;
      } else {
        this.metrics.failed += 1;
      }
      
      // Log performance for slow operations
      if (durationMs > 1000) {
        this.logger.warn(`Slow ${operationName} operation: ${durationMs.toFixed(2)}ms`);
      } else {
        this.logger.debug(`${operationName} completed in ${durationMs.toFixed(2)}ms`);
      }
    }
  }
  
  /**
   * Get performance metrics
   * 
   * @returns {Object} - Performance metrics
   */
  getMetrics() {
    const avgTime = this.metrics.processed > 0 
      ? this.metrics.processingTimeMs / this.metrics.processed 
      : 0;
    
    return {
      ...this.metrics,
      averageProcessingTimeMs: avgTime,
      successRate: this.metrics.processed > 0 
        ? this.metrics.successful / this.metrics.processed 
        : 0
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      processed: 0,
      successful: 0,
      failed: 0,
      processingTimeMs: 0
    };
  }
  
  /**
   * Check if a confidence score meets the threshold
   * 
   * @param {number} confidence - The confidence score
   * @returns {string} - 'high', 'medium', 'low', or 'insufficient'
   */
  getConfidenceLevel(confidence) {
    if (confidence >= this.confidence.highThreshold) {
      return 'high';
    } else if (confidence >= this.confidence.threshold) {
      return 'medium';
    } else if (confidence >= this.confidence.lowThreshold) {
      return 'low';
    } else {
      return 'insufficient';
    }
  }
  
  /**
   * Create a standard result object
   * 
   * @param {boolean} success - Whether the processing was successful
   * @param {*} data - The processed data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Standardized result object
   */
  createResult(success, data = null, metadata = {}) {
    return {
      success,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        processor: this.constructor.name,
        ...metadata
      }
    };
  }
  
  /**
   * Create a success result
   * 
   * @param {*} data - The processed data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Success result
   */
  createSuccessResult(data, metadata = {}) {
    return this.createResult(true, data, metadata);
  }
  
  /**
   * Create an error result
   * 
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} details - Additional error details
   * @returns {Object} - Error result
   */
  createErrorResult(message, code = 'PROCESSING_ERROR', details = {}) {
    return this.createResult(false, null, {
      error: {
        message,
        code,
        details
      }
    });
  }
}

module.exports = NLPProcessorBase;