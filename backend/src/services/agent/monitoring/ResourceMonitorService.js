/**
 * ResourceMonitorService.js
 * 
 * Service for monitoring system and application resources to ensure
 * optimal performance and identify potential issues.
 */

const os = require('os');
const v8 = require('v8');
const logger = require('../../../utils/logger');

class ResourceMonitorService {
  /**
   * Initialize the resource monitor service
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      monitoringEnabled: options.monitoringEnabled !== false,
      sampleInterval: options.sampleInterval || 60 * 1000, // 1 minute
      alertThresholds: {
        cpu: options.cpuThreshold || 80, // Percentage
        memory: options.memoryThreshold || 80, // Percentage
        heap: options.heapThreshold || 85, // Percentage
        eventLoopLag: options.eventLoopLagThreshold || 100, // ms
        requestTime: options.requestTimeThreshold || 1000, // ms
        ...options.alertThresholds
      },
      retentionPeriod: options.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      maxSamples: options.maxSamples || 1440, // 24 hours at 1 sample per minute
      alertCallback: options.alertCallback || null,
      ...options
    };
    
    // Initialize resource metrics
    this.metrics = {
      system: {
        cpu: [],
        memory: [],
        loadAverage: [],
        uptime: []
      },
      process: {
        cpu: [],
        memory: [],
        heap: [],
        eventLoop: [],
        handles: []
      },
      agent: {
        requestRate: [],
        responseTime: [],
        errors: [],
        warnings: [],
        queueLength: []
      },
      trends: {
        hourly: {},
        daily: {}
      }
    };
    
    // Alert history
    this.alerts = [];
    
    // Setup monitor interval
    if (this.options.monitoringEnabled) {
      this._startMonitoring();
    }
    
    logger.info(`ResourceMonitorService initialized, monitoring enabled: ${this.options.monitoringEnabled}`);
  }
  
  /**
   * Start the resource monitoring
   */
  startMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    this.options.monitoringEnabled = true;
    this._startMonitoring();
    logger.info('Resource monitoring started');
  }
  
  /**
   * Stop the resource monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.options.monitoringEnabled = false;
    logger.info('Resource monitoring stopped');
  }
  
  /**
   * Collect a snapshot of current resource usage
   * 
   * @returns {Object} - Resource usage snapshot
   */
  collectResourceSnapshot() {
    const timestamp = Date.now();
    
    // System metrics
    const cpuUsage = this._getCpuUsage();
    const memoryInfo = this._getMemoryInfo();
    const loadAverage = os.loadavg();
    const systemUptime = os.uptime();
    
    // Process metrics
    const processCpu = process.cpuUsage();
    const processMemory = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const eventLoopLag = this._getEventLoopLag();
    const handleCount = this._getHandleCount();
    
    // Create snapshot
    const snapshot = {
      timestamp,
      system: {
        cpu: cpuUsage,
        memory: memoryInfo,
        loadAverage,
        uptime: systemUptime
      },
      process: {
        cpu: {
          user: processCpu.user,
          system: processCpu.system,
          percent: this._calculateCpuPercent(processCpu)
        },
        memory: {
          rss: processMemory.rss,
          heapTotal: processMemory.heapTotal,
          heapUsed: processMemory.heapUsed,
          external: processMemory.external,
          arrayBuffers: processMemory.arrayBuffers
        },
        heap: {
          totalHeapSize: heapStats.total_heap_size,
          totalHeapSizeExecutable: heapStats.total_heap_size_executable,
          totalPhysicalSize: heapStats.total_physical_size,
          totalAvailableSize: heapStats.total_available_size,
          usedHeapSize: heapStats.used_heap_size,
          heapSizeLimit: heapStats.heap_size_limit,
          mallocedMemory: heapStats.malloced_memory,
          peakMallocedMemory: heapStats.peak_malloced_memory
        },
        eventLoop: eventLoopLag,
        handles: handleCount
      }
    };
    
    // Check for alerts
    this._checkAlerts(snapshot);
    
    // Save metrics
    this._updateMetrics(snapshot);
    
    return snapshot;
  }
  
  /**
   * Update agent performance metrics
   * 
   * @param {Object} metrics - Agent performance metrics
   */
  updateAgentMetrics(metrics) {
    const timestamp = Date.now();
    
    // Add to metrics collections
    if (metrics.requestRate !== undefined) {
      this.metrics.agent.requestRate.push({
        timestamp,
        value: metrics.requestRate
      });
    }
    
    if (metrics.responseTime !== undefined) {
      this.metrics.agent.responseTime.push({
        timestamp,
        value: metrics.responseTime
      });
    }
    
    if (metrics.errors !== undefined) {
      this.metrics.agent.errors.push({
        timestamp,
        value: metrics.errors
      });
    }
    
    if (metrics.warnings !== undefined) {
      this.metrics.agent.warnings.push({
        timestamp,
        value: metrics.warnings
      });
    }
    
    if (metrics.queueLength !== undefined) {
      this.metrics.agent.queueLength.push({
        timestamp,
        value: metrics.queueLength
      });
    }
    
    // Check for alerts
    if (metrics.responseTime > this.options.alertThresholds.requestTime) {
      this._addAlert('response_time', 'Response time exceeds threshold', {
        value: metrics.responseTime,
        threshold: this.options.alertThresholds.requestTime
      });
    }
    
    // Enforce limits on array sizes
    this._limitMetricsArrays();
  }
  
  /**
   * Get the current resource usage
   * 
   * @param {string} category - Metrics category (system, process, agent)
   * @returns {Object} - Resource usage metrics
   */
  getResourceMetrics(category = null) {
    if (category) {
      return this.metrics[category] || {};
    }
    
    return this.metrics;
  }
  
  /**
   * Get recent alerts
   * 
   * @param {Object} options - Retrieval options
   * @returns {Array} - Recent alerts
   */
  getAlerts(options = {}) {
    const {
      limit = 100,
      timeRange = 24 * 60 * 60 * 1000, // 24 hours
      type = null
    } = options;
    
    const minTimestamp = Date.now() - timeRange;
    
    let filteredAlerts = this.alerts.filter(alert => alert.timestamp >= minTimestamp);
    
    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }
    
    return filteredAlerts.slice(-limit);
  }
  
  /**
   * Clear all collected metrics
   */
  clearMetrics() {
    // Reset all metrics arrays
    Object.keys(this.metrics.system).forEach(key => {
      this.metrics.system[key] = [];
    });
    
    Object.keys(this.metrics.process).forEach(key => {
      this.metrics.process[key] = [];
    });
    
    Object.keys(this.metrics.agent).forEach(key => {
      this.metrics.agent[key] = [];
    });
    
    // Reset trends
    this.metrics.trends = {
      hourly: {},
      daily: {}
    };
    
    // Clear alerts
    this.alerts = [];
    
    logger.info('Resource metrics cleared');
  }
  
  /**
   * Destroy the service and clean up resources
   */
  destroy() {
    // Stop monitoring interval
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    logger.info('ResourceMonitorService destroyed');
  }
  
  /**
   * Start monitoring resources at regular intervals
   * 
   * @private
   */
  _startMonitoring() {
    // Collect initial snapshot
    this.collectResourceSnapshot();
    
    // Set up interval
    this.monitorInterval = setInterval(() => {
      this.collectResourceSnapshot();
    }, this.options.sampleInterval);
    
    // Make sure interval doesn't prevent process exit
    this.monitorInterval.unref();
  }
  
  /**
   * Get current CPU usage percentage
   * 
   * @private
   * @returns {Object} - CPU usage information
   */
  _getCpuUsage() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    }
    
    return {
      idle: idle / cpus.length,
      total: total / cpus.length,
      used: (total - idle) / cpus.length,
      percent: ((total - idle) / total) * 100
    };
  }
  
  /**
   * Get system memory information
   * 
   * @private
   * @returns {Object} - Memory usage information
   */
  _getMemoryInfo() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      percent: (usedMemory / totalMemory) * 100
    };
  }
  
  /**
   * Get current event loop lag
   * 
   * @private
   * @returns {Object} - Event loop lag information
   */
  _getEventLoopLag() {
    return new Promise(resolve => {
      const start = process.hrtime();
      
      setImmediate(() => {
        const elapsed = process.hrtime(start);
        const lag = Math.round((elapsed[0] * 1000) + (elapsed[1] / 1000000));
        
        resolve({
          lag,
          timestamp: Date.now()
        });
      });
    });
  }
  
  /**
   * Calculate CPU usage percentage for this process
   * 
   * @private
   * @param {Object} cpuUsage - CPU usage data
   * @returns {number} - CPU usage percentage
   */
  _calculateCpuPercent(cpuUsage) {
    const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    const cpuCount = os.cpus().length;
    
    // Calculate usage since last measurement
    if (this._lastCpuUsage) {
      const userDiff = cpuUsage.user - this._lastCpuUsage.user;
      const systemDiff = cpuUsage.system - this._lastCpuUsage.system;
      const elapsed = process.uptime() - this._lastCpuTime;
      
      this._lastCpuUsage = cpuUsage;
      this._lastCpuTime = process.uptime();
      
      if (elapsed <= 0) return 0;
      
      return ((userDiff + systemDiff) / 1000000 / elapsed) * 100 / cpuCount;
    }
    
    // First measurement
    this._lastCpuUsage = cpuUsage;
    this._lastCpuTime = process.uptime();
    
    return (totalUsage / process.uptime()) * 100 / cpuCount;
  }
  
  /**
   * Get the number of active handles in the event loop
   * 
   * @private
   * @returns {number} - Number of handles
   */
  _getHandleCount() {
    // This is not a standard API, but works for debugging
    // Will return 0 if not available
    return process._getActiveHandles?.()?.length || 0;
  }
  
  /**
   * Check for resource usage alerts
   * 
   * @private
   * @param {Object} snapshot - Resource snapshot
   */
  _checkAlerts(snapshot) {
    // Check CPU usage
    if (snapshot.system.cpu.percent > this.options.alertThresholds.cpu) {
      this._addAlert('cpu', 'CPU usage exceeds threshold', {
        value: snapshot.system.cpu.percent,
        threshold: this.options.alertThresholds.cpu
      });
    }
    
    // Check memory usage
    if (snapshot.system.memory.percent > this.options.alertThresholds.memory) {
      this._addAlert('memory', 'Memory usage exceeds threshold', {
        value: snapshot.system.memory.percent,
        threshold: this.options.alertThresholds.memory
      });
    }
    
    // Check heap usage
    const heapPercent = (snapshot.process.heap.usedHeapSize / snapshot.process.heap.heapSizeLimit) * 100;
    if (heapPercent > this.options.alertThresholds.heap) {
      this._addAlert('heap', 'Heap usage exceeds threshold', {
        value: heapPercent,
        threshold: this.options.alertThresholds.heap
      });
    }
    
    // Check event loop lag
    const checkEventLoopLag = async () => {
      const eventLoopLag = await snapshot.process.eventLoop;
      if (eventLoopLag.lag > this.options.alertThresholds.eventLoopLag) {
        this._addAlert('event_loop', 'Event loop lag exceeds threshold', {
          value: eventLoopLag.lag,
          threshold: this.options.alertThresholds.eventLoopLag
        });
      }
    };
    
    checkEventLoopLag();
  }
  
  /**
   * Add an alert to the alert history
   * 
   * @private
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   * @param {Object} data - Alert data
   */
  _addAlert(type, message, data) {
    const alert = {
      type,
      message,
      timestamp: Date.now(),
      data
    };
    
    this.alerts.push(alert);
    
    // Limit the number of alerts
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }
    
    // Log the alert
    logger.warn(`Resource alert: ${message}`, data);
    
    // Call alert callback if provided
    if (typeof this.options.alertCallback === 'function') {
      try {
        this.options.alertCallback(alert);
      } catch (error) {
        logger.error(`Error in alert callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Update metrics with new snapshot data
   * 
   * @private
   * @param {Object} snapshot - Resource snapshot
   */
  async _updateMetrics(snapshot) {
    // Add system metrics
    this.metrics.system.cpu.push({
      timestamp: snapshot.timestamp,
      ...snapshot.system.cpu
    });
    
    this.metrics.system.memory.push({
      timestamp: snapshot.timestamp,
      ...snapshot.system.memory
    });
    
    this.metrics.system.loadAverage.push({
      timestamp: snapshot.timestamp,
      values: snapshot.system.loadAverage
    });
    
    this.metrics.system.uptime.push({
      timestamp: snapshot.timestamp,
      value: snapshot.system.uptime
    });
    
    // Add process metrics
    this.metrics.process.cpu.push({
      timestamp: snapshot.timestamp,
      ...snapshot.process.cpu
    });
    
    this.metrics.process.memory.push({
      timestamp: snapshot.timestamp,
      ...snapshot.process.memory
    });
    
    this.metrics.process.heap.push({
      timestamp: snapshot.timestamp,
      ...snapshot.process.heap
    });
    
    // Event loop lag is already a promise
    const eventLoopLag = await snapshot.process.eventLoop;
    this.metrics.process.eventLoop.push(eventLoopLag);
    
    this.metrics.process.handles.push({
      timestamp: snapshot.timestamp,
      count: snapshot.process.handles
    });
    
    // Update trends data
    this._updateTrends(snapshot);
    
    // Enforce limits on array sizes
    this._limitMetricsArrays();
  }
  
  /**
   * Update trends data with new snapshot
   * 
   * @private
   * @param {Object} snapshot - Resource snapshot
   */
  _updateTrends(snapshot) {
    const hourKey = new Date(snapshot.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const dayKey = new Date(snapshot.timestamp).toISOString().slice(0, 10);  // YYYY-MM-DD
    
    // Initialize hourly data if needed
    if (!this.metrics.trends.hourly[hourKey]) {
      this.metrics.trends.hourly[hourKey] = {
        cpu: { min: 100, max: 0, sum: 0, count: 0 },
        memory: { min: 100, max: 0, sum: 0, count: 0 },
        heap: { min: 100, max: 0, sum: 0, count: 0 },
        eventLoop: { min: Infinity, max: 0, sum: 0, count: 0 }
      };
    }
    
    // Initialize daily data if needed
    if (!this.metrics.trends.daily[dayKey]) {
      this.metrics.trends.daily[dayKey] = {
        cpu: { min: 100, max: 0, sum: 0, count: 0 },
        memory: { min: 100, max: 0, sum: 0, count: 0 },
        heap: { min: 100, max: 0, sum: 0, count: 0 },
        eventLoop: { min: Infinity, max: 0, sum: 0, count: 0 }
      };
    }
    
    // Update hourly data
    const hourData = this.metrics.trends.hourly[hourKey];
    this._updateTrendEntry(hourData.cpu, snapshot.system.cpu.percent);
    this._updateTrendEntry(hourData.memory, snapshot.system.memory.percent);
    
    const heapPercent = (snapshot.process.heap.usedHeapSize / snapshot.process.heap.heapSizeLimit) * 100;
    this._updateTrendEntry(hourData.heap, heapPercent);
    
    // Event loop lag will be updated asynchronously
    snapshot.process.eventLoop.then(eventLoopData => {
      this._updateTrendEntry(hourData.eventLoop, eventLoopData.lag);
      
      // Also update daily data
      const dayData = this.metrics.trends.daily[dayKey];
      this._updateTrendEntry(dayData.eventLoop, eventLoopData.lag);
    });
    
    // Update daily data
    const dayData = this.metrics.trends.daily[dayKey];
    this._updateTrendEntry(dayData.cpu, snapshot.system.cpu.percent);
    this._updateTrendEntry(dayData.memory, snapshot.system.memory.percent);
    this._updateTrendEntry(dayData.heap, heapPercent);
    
    // Limit the number of trend entries
    const maxDays = 30; // Keep 30 days of daily data
    const maxHours = 168; // Keep 7 days of hourly data (7 * 24)
    
    const hourKeys = Object.keys(this.metrics.trends.hourly).sort();
    if (hourKeys.length > maxHours) {
      for (let i = 0; i < hourKeys.length - maxHours; i++) {
        delete this.metrics.trends.hourly[hourKeys[i]];
      }
    }
    
    const dayKeys = Object.keys(this.metrics.trends.daily).sort();
    if (dayKeys.length > maxDays) {
      for (let i = 0; i < dayKeys.length - maxDays; i++) {
        delete this.metrics.trends.daily[dayKeys[i]];
      }
    }
  }
  
  /**
   * Update a trend entry with new value
   * 
   * @private
   * @param {Object} entry - Trend entry
   * @param {number} value - New value
   */
  _updateTrendEntry(entry, value) {
    if (value < entry.min) entry.min = value;
    if (value > entry.max) entry.max = value;
    entry.sum += value;
    entry.count++;
  }
  
  /**
   * Limit metrics arrays to prevent memory growth
   * 
   * @private
   */
  _limitMetricsArrays() {
    // Determine maximum number of samples to keep
    const maxSamples = this.options.maxSamples;
    
    // Limit system metrics
    Object.keys(this.metrics.system).forEach(key => {
      if (this.metrics.system[key].length > maxSamples) {
        this.metrics.system[key] = this.metrics.system[key].slice(-maxSamples);
      }
    });
    
    // Limit process metrics
    Object.keys(this.metrics.process).forEach(key => {
      if (this.metrics.process[key].length > maxSamples) {
        this.metrics.process[key] = this.metrics.process[key].slice(-maxSamples);
      }
    });
    
    // Limit agent metrics
    Object.keys(this.metrics.agent).forEach(key => {
      if (this.metrics.agent[key].length > maxSamples) {
        this.metrics.agent[key] = this.metrics.agent[key].slice(-maxSamples);
      }
    });
  }
}

module.exports = ResourceMonitorService;