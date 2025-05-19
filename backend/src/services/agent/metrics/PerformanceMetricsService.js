/**
 * PerformanceMetricsService.js
 * 
 * Service for tracking and reporting performance metrics across agent components.
 * Provides real-time monitoring of response times, throughput, and system resource usage.
 */

const os = require('os');
const logger = require('../../../utils/logger');

class PerformanceMetricsService {
  /**
   * Initialize the performance metrics service
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      enableMetrics: options.enableMetrics !== false,
      metricRetentionPeriod: options.metricRetentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      intervalSampling: options.intervalSampling || 60 * 1000, // 1 minute
      histogramBuckets: options.histogramBuckets || [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000], // ms
      enableResourceMetrics: options.enableResourceMetrics !== false,
      resourceSamplingInterval: options.resourceSamplingInterval || 5 * 60 * 1000, // 5 minutes
      ...options
    };
    
    // Initialize metrics storage
    this.metrics = {
      requests: {
        total: 0,
        succeeded: 0,
        failed: 0,
        byType: new Map(), // Maps request types to counts
        byService: new Map() // Maps service names to counts
      },
      
      responseTimes: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
        byService: new Map(),
        histogram: this._initializeHistogram()
      },
      
      cache: {
        hits: 0,
        misses: 0,
        hitRatio: 0,
        byType: new Map()
      },
      
      resources: {
        cpu: [],
        memory: [],
        heap: [],
        eventLoop: []
      },
      
      // Time series data for trends
      timeSeries: {
        requestRate: [],
        responseTime: [],
        cacheHitRatio: [],
        errorRate: []
      }
    };
    
    // Lists of raw response times for percentile calculations
    this.responseTimesList = [];
    
    // Last update timestamp
    this.lastUpdateTime = Date.now();
    
    // Start resource monitoring if enabled
    if (this.options.enableResourceMetrics) {
      this._startResourceMonitoring();
    }
    
    // Start time series collection
    this._startTimeSeriesCollection();
    
    logger.info(`PerformanceMetricsService initialized, metrics enabled: ${this.options.enableMetrics}`);
  }
  
  /**
   * Record the start of a request
   * 
   * @param {string} requestId - Unique request identifier
   * @param {Object} metadata - Request metadata
   * @returns {Object} - Request tracking object
   */
  startRequest(requestId, metadata = {}) {
    if (!this.options.enableMetrics) return null;
    
    const request = {
      id: requestId || this._generateRequestId(),
      startTime: Date.now(),
      type: metadata.type || 'unknown',
      service: metadata.service || 'unknown',
      metadata
    };
    
    return request;
  }
  
  /**
   * Record the completion of a request
   * 
   * @param {Object} request - Request tracking object from startRequest
   * @param {Object} result - Result of the request
   */
  endRequest(request, result = {}) {
    if (!this.options.enableMetrics || !request) return;
    
    const endTime = Date.now();
    const responseTime = endTime - request.startTime;
    const success = result.success !== false;
    
    // Update request counts
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.succeeded++;
    } else {
      this.metrics.requests.failed++;
    }
    
    // Update by type
    if (!this.metrics.requests.byType.has(request.type)) {
      this.metrics.requests.byType.set(request.type, { total: 0, succeeded: 0, failed: 0 });
    }
    const typeMetrics = this.metrics.requests.byType.get(request.type);
    typeMetrics.total++;
    if (success) {
      typeMetrics.succeeded++;
    } else {
      typeMetrics.failed++;
    }
    
    // Update by service
    if (!this.metrics.requests.byService.has(request.service)) {
      this.metrics.requests.byService.set(request.service, { total: 0, succeeded: 0, failed: 0 });
    }
    const serviceMetrics = this.metrics.requests.byService.get(request.service);
    serviceMetrics.total++;
    if (success) {
      serviceMetrics.succeeded++;
    } else {
      serviceMetrics.failed++;
    }
    
    // Update response time metrics
    this._updateResponseTimeMetrics(responseTime, request.service);
    
    // Update cache metrics if provided
    if (result.fromCache !== undefined) {
      this._updateCacheMetrics(result.fromCache, request.type);
    }
    
    // Log significant slow requests
    if (responseTime > 1000) {
      logger.debug(`Slow request ${request.id} (${request.type}): ${responseTime}ms`);
    }
  }
  
  /**
   * Record a cache operation
   * 
   * @param {boolean} hit - Whether the cache operation was a hit
   * @param {string} type - Type of cache operation
   */
  recordCacheOperation(hit, type = 'default') {
    if (!this.options.enableMetrics) return;
    
    // Update overall cache metrics
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
    
    this.metrics.cache.hitRatio = this.metrics.cache.hits / 
      (this.metrics.cache.hits + this.metrics.cache.misses || 1);
    
    // Update by type
    if (!this.metrics.cache.byType.has(type)) {
      this.metrics.cache.byType.set(type, { hits: 0, misses: 0, hitRatio: 0 });
    }
    
    const typeMetrics = this.metrics.cache.byType.get(type);
    
    if (hit) {
      typeMetrics.hits++;
    } else {
      typeMetrics.misses++;
    }
    
    typeMetrics.hitRatio = typeMetrics.hits / (typeMetrics.hits + typeMetrics.misses || 1);
  }
  
  /**
   * Get current performance metrics
   * 
   * @param {string} category - Specific category of metrics to retrieve
   * @returns {Object} - Performance metrics
   */
  getMetrics(category = null) {
    // If a specific category is requested, return only that
    if (category && this.metrics[category]) {
      return this.metrics[category];
    }
    
    // Calculate derived metrics before returning
    const totalRequests = this.metrics.requests.total;
    const errorRate = totalRequests ? this.metrics.requests.failed / totalRequests : 0;
    
    return {
      timestamp: Date.now(),
      uptime: process.uptime(),
      ...this.metrics,
      derived: {
        errorRate,
        throughput: this._calculateThroughput(),
        responseTimePercentiles: this._calculateResponseTimePercentiles()
      }
    };
  }
  
  /**
   * Reset metrics counters
   * 
   * @param {string} category - Specific category to reset, or null for all
   */
  resetMetrics(category = null) {
    if (category && this.metrics[category]) {
      // Reset a specific category
      if (category === 'requests') {
        this.metrics.requests = {
          total: 0,
          succeeded: 0,
          failed: 0,
          byType: new Map(),
          byService: new Map()
        };
      } else if (category === 'responseTimes') {
        this.metrics.responseTimes = {
          total: 0,
          count: 0,
          min: Infinity,
          max: 0,
          average: 0,
          median: 0,
          p95: 0,
          p99: 0,
          byService: new Map(),
          histogram: this._initializeHistogram()
        };
        this.responseTimesList = [];
      } else if (category === 'cache') {
        this.metrics.cache = {
          hits: 0,
          misses: 0,
          hitRatio: 0,
          byType: new Map()
        };
      } else if (category === 'resources') {
        this.metrics.resources = {
          cpu: [],
          memory: [],
          heap: [],
          eventLoop: []
        };
      } else if (category === 'timeSeries') {
        this.metrics.timeSeries = {
          requestRate: [],
          responseTime: [],
          cacheHitRatio: [],
          errorRate: []
        };
      }
    } else {
      // Reset all metrics
      this.metrics = {
        requests: {
          total: 0,
          succeeded: 0,
          failed: 0,
          byType: new Map(),
          byService: new Map()
        },
        
        responseTimes: {
          total: 0,
          count: 0,
          min: Infinity,
          max: 0,
          average: 0,
          median: 0,
          p95: 0,
          p99: 0,
          byService: new Map(),
          histogram: this._initializeHistogram()
        },
        
        cache: {
          hits: 0,
          misses: 0,
          hitRatio: 0,
          byType: new Map()
        },
        
        resources: {
          cpu: [],
          memory: [],
          heap: [],
          eventLoop: []
        },
        
        timeSeries: {
          requestRate: [],
          responseTime: [],
          cacheHitRatio: [],
          errorRate: []
        }
      };
      
      this.responseTimesList = [];
      this.lastUpdateTime = Date.now();
    }
    
    logger.info(`Metrics reset: ${category || 'all categories'}`);
  }
  
  /**
   * Get time series data for a specific metric
   * 
   * @param {string} metric - Metric name
   * @param {Object} options - Retrieval options
   * @returns {Array} - Time series data
   */
  getTimeSeries(metric, options = {}) {
    const {
      limit = 100,
      timeRange = 60 * 60 * 1000 // 1 hour
    } = options;
    
    if (!this.metrics.timeSeries[metric]) {
      return [];
    }
    
    const now = Date.now();
    const timeThreshold = now - timeRange;
    
    // Filter by time range and limit the number of points
    const filtered = this.metrics.timeSeries[metric]
      .filter(point => point.timestamp >= timeThreshold)
      .slice(-limit);
    
    return filtered;
  }
  
  /**
   * Enable or disable metrics collection
   * 
   * @param {boolean} enabled - Whether metrics should be enabled
   */
  setEnabled(enabled) {
    this.options.enableMetrics = !!enabled;
    logger.info(`Performance metrics ${this.options.enableMetrics ? 'enabled' : 'disabled'}`);
    
    // Start or stop resource monitoring if needed
    if (this.options.enableMetrics && this.options.enableResourceMetrics && !this.resourceMonitorInterval) {
      this._startResourceMonitoring();
    } else if (!this.options.enableMetrics && this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = null;
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = null;
    }
    
    if (this.timeSeriesInterval) {
      clearInterval(this.timeSeriesInterval);
      this.timeSeriesInterval = null;
    }
    
    logger.info('PerformanceMetricsService destroyed');
  }
  
  /**
   * Update response time metrics
   * 
   * @private
   * @param {number} responseTime - Response time in milliseconds
   * @param {string} service - Service name
   */
  _updateResponseTimeMetrics(responseTime, service) {
    // Update overall response time metrics
    this.metrics.responseTimes.total += responseTime;
    this.metrics.responseTimes.count++;
    
    if (responseTime < this.metrics.responseTimes.min) {
      this.metrics.responseTimes.min = responseTime;
    }
    
    if (responseTime > this.metrics.responseTimes.max) {
      this.metrics.responseTimes.max = responseTime;
    }
    
    this.metrics.responseTimes.average = 
      this.metrics.responseTimes.total / this.metrics.responseTimes.count;
    
    // Add to response times list for percentile calculations
    // Keep the list at a reasonable size to avoid memory issues
    this.responseTimesList.push(responseTime);
    if (this.responseTimesList.length > 1000) {
      this.responseTimesList.shift();
    }
    
    // Update histogram
    const histogramBucket = this._getHistogramBucket(responseTime);
    this.metrics.responseTimes.histogram[histogramBucket]++;
    
    // Update service-specific metrics
    if (!this.metrics.responseTimes.byService.has(service)) {
      this.metrics.responseTimes.byService.set(service, {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        average: 0
      });
    }
    
    const serviceMetrics = this.metrics.responseTimes.byService.get(service);
    serviceMetrics.total += responseTime;
    serviceMetrics.count++;
    
    if (responseTime < serviceMetrics.min) {
      serviceMetrics.min = responseTime;
    }
    
    if (responseTime > serviceMetrics.max) {
      serviceMetrics.max = responseTime;
    }
    
    serviceMetrics.average = serviceMetrics.total / serviceMetrics.count;
    
    // Periodically recalculate percentiles (expensive operation)
    const now = Date.now();
    if (now - this.lastPercentileCalculation > 10000) { // Every 10 seconds
      this._calculateResponseTimePercentiles();
      this.lastPercentileCalculation = now;
    }
  }
  
  /**
   * Update cache metrics
   * 
   * @private
   * @param {boolean} hit - Whether the cache operation was a hit
   * @param {string} type - Type of cache operation
   */
  _updateCacheMetrics(hit, type) {
    // Use the generic method
    this.recordCacheOperation(hit, type);
  }
  
  /**
   * Initialize the response time histogram
   * 
   * @private
   * @returns {Object} - Initialized histogram
   */
  _initializeHistogram() {
    const histogram = {};
    
    // Initialize buckets
    for (let i = 0; i < this.options.histogramBuckets.length; i++) {
      const bucketName = this._getHistogramBucketName(i);
      histogram[bucketName] = 0;
    }
    
    // Add overflow bucket
    histogram.overflow = 0;
    
    return histogram;
  }
  
  /**
   * Get the appropriate histogram bucket for a response time
   * 
   * @private
   * @param {number} responseTime - Response time in milliseconds
   * @returns {string} - Bucket name
   */
  _getHistogramBucket(responseTime) {
    const buckets = this.options.histogramBuckets;
    
    for (let i = 0; i < buckets.length; i++) {
      if (responseTime <= buckets[i]) {
        return this._getHistogramBucketName(i);
      }
    }
    
    return 'overflow';
  }
  
  /**
   * Get the name of a histogram bucket by index
   * 
   * @private
   * @param {number} index - Bucket index
   * @returns {string} - Bucket name
   */
  _getHistogramBucketName(index) {
    const buckets = this.options.histogramBuckets;
    
    if (index === 0) {
      return `le_${buckets[0]}ms`;
    } else {
      return `le_${buckets[index]}ms`;
    }
  }
  
  /**
   * Calculate response time percentiles
   * 
   * @private
   * @returns {Object} - Percentile values
   */
  _calculateResponseTimePercentiles() {
    if (this.responseTimesList.length === 0) {
      return {
        median: 0,
        p90: 0,
        p95: 0,
        p99: 0
      };
    }
    
    // Create a sorted copy of the response times list
    const sorted = [...this.responseTimesList].sort((a, b) => a - b);
    
    // Calculate percentiles
    const median = this._getPercentile(sorted, 50);
    const p90 = this._getPercentile(sorted, 90);
    const p95 = this._getPercentile(sorted, 95);
    const p99 = this._getPercentile(sorted, 99);
    
    // Update metrics
    this.metrics.responseTimes.median = median;
    this.metrics.responseTimes.p90 = p90;
    this.metrics.responseTimes.p95 = p95;
    this.metrics.responseTimes.p99 = p99;
    
    return { median, p90, p95, p99 };
  }
  
  /**
   * Get a specific percentile from a sorted array
   * 
   * @private
   * @param {Array} sorted - Sorted array of values
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} - Percentile value
   */
  _getPercentile(sorted, percentile) {
    if (sorted.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
  }
  
  /**
   * Calculate the current request throughput
   * 
   * @private
   * @returns {number} - Requests per second
   */
  _calculateThroughput() {
    const now = Date.now();
    const timeDiff = (now - this.lastUpdateTime) / 1000; // seconds
    
    if (timeDiff <= 0) return 0;
    
    const throughput = this.metrics.requests.total / timeDiff;
    
    // Reset for next calculation
    this.lastUpdateTime = now;
    
    return throughput;
  }
  
  /**
   * Start resource monitoring
   * 
   * @private
   */
  _startResourceMonitoring() {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
    }
    
    // Initial sample
    this._collectResourceMetrics();
    
    // Set up interval sampling
    this.resourceMonitorInterval = setInterval(() => {
      this._collectResourceMetrics();
    }, this.options.resourceSamplingInterval);
    
    // Make sure interval doesn't prevent process exit
    this.resourceMonitorInterval.unref();
  }
  
  /**
   * Collect system resource metrics
   * 
   * @private
   */
  _collectResourceMetrics() {
    if (!this.options.enableMetrics || !this.options.enableResourceMetrics) return;
    
    const timestamp = Date.now();
    
    // CPU usage
    const cpuUsage = process.cpuUsage();
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100; // Percentage of CPU time
    
    // Memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryPercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    // Store metrics
    this.metrics.resources.cpu.push({
      timestamp,
      percent: cpuPercent,
      raw: cpuUsage
    });
    
    this.metrics.resources.memory.push({
      timestamp,
      percent: memoryPercent,
      total: totalMemory,
      free: freeMemory,
      used: totalMemory - freeMemory
    });
    
    this.metrics.resources.heap.push({
      timestamp,
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      external: memoryUsage.external,
      percent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    });
    
    // Event loop lag (simplified)
    const startTime = process.hrtime();
    
    setImmediate(() => {
      const endTime = process.hrtime(startTime);
      const lagMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
      
      this.metrics.resources.eventLoop.push({
        timestamp,
        lag: lagMs
      });
    });
    
    // Limit the size of resource arrays
    const maxSamples = Math.ceil(this.options.metricRetentionPeriod / this.options.resourceSamplingInterval);
    
    ['cpu', 'memory', 'heap', 'eventLoop'].forEach(key => {
      if (this.metrics.resources[key].length > maxSamples) {
        this.metrics.resources[key] = this.metrics.resources[key].slice(-maxSamples);
      }
    });
  }
  
  /**
   * Start time series data collection
   * 
   * @private
   */
  _startTimeSeriesCollection() {
    if (this.timeSeriesInterval) {
      clearInterval(this.timeSeriesInterval);
    }
    
    // Set up interval sampling
    this.timeSeriesInterval = setInterval(() => {
      this._collectTimeSeriesData();
    }, this.options.intervalSampling);
    
    // Make sure interval doesn't prevent process exit
    this.timeSeriesInterval.unref();
  }
  
  /**
   * Collect time series data
   * 
   * @private
   */
  _collectTimeSeriesData() {
    if (!this.options.enableMetrics) return;
    
    const timestamp = Date.now();
    const totalRequests = this.metrics.requests.total;
    const errorRate = totalRequests ? this.metrics.requests.failed / totalRequests : 0;
    const throughput = this._calculateThroughput();
    const avgResponseTime = this.metrics.responseTimes.average || 0;
    const cacheHitRatio = this.metrics.cache.hitRatio || 0;
    
    // Store data points
    this.metrics.timeSeries.requestRate.push({
      timestamp,
      value: throughput
    });
    
    this.metrics.timeSeries.responseTime.push({
      timestamp,
      value: avgResponseTime
    });
    
    this.metrics.timeSeries.cacheHitRatio.push({
      timestamp,
      value: cacheHitRatio
    });
    
    this.metrics.timeSeries.errorRate.push({
      timestamp,
      value: errorRate
    });
    
    // Limit the size of time series arrays
    const maxDataPoints = Math.ceil(this.options.metricRetentionPeriod / this.options.intervalSampling);
    
    Object.keys(this.metrics.timeSeries).forEach(key => {
      if (this.metrics.timeSeries[key].length > maxDataPoints) {
        this.metrics.timeSeries[key] = this.metrics.timeSeries[key].slice(-maxDataPoints);
      }
    });
  }
  
  /**
   * Generate a unique request ID
   * 
   * @private
   * @returns {string} - Generated request ID
   */
  _generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
}

module.exports = PerformanceMetricsService;