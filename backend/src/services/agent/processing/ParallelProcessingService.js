/**
 * ParallelProcessingService.js
 * 
 * Service for handling parallel execution of tasks to optimize performance
 * and resource utilization. Provides functions for executing tasks in parallel,
 * batching operations, and managing worker threads.
 */

const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');
const logger = require('../../../utils/logger');

class ParallelProcessingService {
  /**
   * Initialize the parallel processing service
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      maxWorkers: options.maxWorkers || Math.max(1, os.cpus().length - 1), // Default to number of cores minus 1
      minBatchSize: options.minBatchSize || 5, // Minimum batch size to use parallelization
      maxBatchSize: options.maxBatchSize || 50, // Maximum items per batch
      workerTimeout: options.workerTimeout || 30000, // 30 seconds worker timeout
      workerPath: options.workerPath || path.join(__dirname, 'workers', 'processingWorker.js'),
      enableThreadPool: options.enableThreadPool !== false,
      ...options
    };
    
    // Initialize worker pool if enabled
    this.workerPool = [];
    this.activeWorkers = 0;
    this.taskQueue = [];
    this.isProcessingQueue = false;
    
    if (this.options.enableThreadPool) {
      this._initializeWorkerPool();
    }
    
    // Task statistics
    this.stats = {
      tasksSubmitted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      maxConcurrentTasks: 0,
      parallelizationRate: 0
    };
    
    logger.info(`ParallelProcessingService initialized with ${this.options.maxWorkers} max workers`);
  }
  
  /**
   * Execute tasks in parallel
   * 
   * @param {Array} tasks - Array of task functions or data
   * @param {Function} processorFn - Function to process each task (if tasks are data)
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} - Array of task results
   */
  async executeParallel(tasks, processorFn = null, options = {}) {
    const startTime = Date.now();
    
    const {
      timeout = this.options.workerTimeout,
      maxConcurrent = this.options.maxWorkers,
      useWorkers = this.options.enableThreadPool,
      abortOnError = false
    } = options;
    
    // Update stats
    this.stats.tasksSubmitted += tasks.length;
    
    // If there are very few tasks, or workers are disabled, use Promise.all
    if (tasks.length < this.options.minBatchSize || !useWorkers) {
      logger.debug(`Executing ${tasks.length} tasks in parallel using Promise.all`);
      
      try {
        const taskFunctions = processorFn ? 
          tasks.map(task => () => processorFn(task)) : 
          tasks;
          
        const results = await Promise.all(
          taskFunctions.map(taskFn => this._executeWithTimeout(taskFn, timeout))
        );
        
        // Update stats
        this.stats.tasksCompleted += tasks.length;
        this._updateExecutionTimeStats(startTime, tasks.length);
        
        return results;
      } catch (error) {
        this.stats.tasksFailed += abortOnError ? tasks.length : 1;
        throw error;
      }
    }
    
    // For larger task sets, use worker threads or batched execution
    logger.debug(`Executing ${tasks.length} tasks with worker threads, maxConcurrent: ${maxConcurrent}`);
    
    // Track concurrent execution for stats
    const trackConcurrent = (concurrent) => {
      if (concurrent > this.stats.maxConcurrentTasks) {
        this.stats.maxConcurrentTasks = concurrent;
      }
    };
    
    try {
      let results;
      
      if (useWorkers && this.options.enableThreadPool) {
        // Use worker thread pool
        results = await this._executeWithWorkerPool(tasks, processorFn, {
          timeout,
          maxConcurrent,
          abortOnError,
          onConcurrentUpdate: trackConcurrent
        });
      } else {
        // Use batched promise execution
        results = await this._executeBatched(tasks, processorFn, {
          timeout,
          maxConcurrent,
          abortOnError,
          onConcurrentUpdate: trackConcurrent
        });
      }
      
      // Update stats
      this.stats.tasksCompleted += tasks.length;
      this._updateExecutionTimeStats(startTime, tasks.length);
      this.stats.parallelizationRate = maxConcurrent / tasks.length;
      
      return results;
    } catch (error) {
      this.stats.tasksFailed += abortOnError ? tasks.length : 1;
      throw error;
    }
  }
  
  /**
   * Batch data items for processing
   * 
   * @param {Array} items - Array of data items
   * @param {number} batchSize - Size of each batch
   * @returns {Array} - Array of batches
   */
  createBatches(items, batchSize = this.options.maxBatchSize) {
    const batches = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }
  
  /**
   * Process batches in parallel
   * 
   * @param {Array} batches - Array of data batches
   * @param {Function} processorFn - Function to process each batch
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} - Flattened array of results
   */
  async processBatches(batches, processorFn, options = {}) {
    const batchResults = await this.executeParallel(batches, processorFn, options);
    
    // Flatten the results if each batch returns an array
    if (batchResults.length > 0 && Array.isArray(batchResults[0])) {
      return batchResults.flat();
    }
    
    return batchResults;
  }
  
  /**
   * Submit a task to the queue for processing by a worker
   * 
   * @param {Function|Object} task - Task function or data
   * @param {Function} processorFn - Function to process the task (if task is data)
   * @param {Object} options - Task options
   * @returns {Promise<any>} - Task result
   */
  submitTask(task, processorFn = null, options = {}) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        processorFn,
        options,
        resolve,
        reject,
        submitted: Date.now()
      });
      
      this.stats.tasksSubmitted++;
      
      // Start processing the queue if not already processing
      if (!this.isProcessingQueue) {
        this._processTaskQueue();
      }
    });
  }
  
  /**
   * Get statistics about task execution
   * 
   * @returns {Object} - Service statistics
   */
  getStats() {
    return {
      ...this.stats,
      pendingTasks: this.taskQueue.length,
      activeWorkers: this.activeWorkers,
      maxWorkers: this.options.maxWorkers,
      isProcessingQueue: this.isProcessingQueue
    };
  }
  
  /**
   * Shut down the service and clean up resources
   */
  shutdown() {
    // Terminate all workers
    this.workerPool.forEach(worker => {
      if (worker.worker) {
        worker.worker.terminate();
      }
    });
    
    this.workerPool = [];
    this.activeWorkers = 0;
    
    logger.info('ParallelProcessingService shut down');
  }
  
  /**
   * Initialize the worker pool
   * 
   * @private
   */
  _initializeWorkerPool() {
    logger.debug(`Initializing worker pool with ${this.options.maxWorkers} workers`);
    
    this.workerPool = Array(this.options.maxWorkers).fill(null).map(() => ({
      worker: null,
      busy: false,
      lastUsed: 0
    }));
  }
  
  /**
   * Get an available worker from the pool
   * 
   * @private
   * @returns {Object|null} - Worker object or null if none available
   */
  _getAvailableWorker() {
    // Find an existing idle worker
    const idleWorker = this.workerPool.find(w => w.worker && !w.busy);
    if (idleWorker) {
      return idleWorker;
    }
    
    // Find a slot for a new worker
    const emptySlot = this.workerPool.find(w => !w.worker);
    if (emptySlot) {
      try {
        emptySlot.worker = new Worker(this.options.workerPath);
        logger.debug('Created new worker thread');
        return emptySlot;
      } catch (error) {
        logger.error(`Error creating worker thread: ${error.message}`);
        return null;
      }
    }
    
    // No workers available
    return null;
  }
  
  /**
   * Execute an array of tasks with the worker pool
   * 
   * @private
   * @param {Array} tasks - Array of tasks
   * @param {Function} processorFn - Function to process each task
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} - Array of results
   */
  async _executeWithWorkerPool(tasks, processorFn, options) {
    const results = new Array(tasks.length);
    const errors = [];
    
    // Create a promise for worker pool execution
    return new Promise((resolve, reject) => {
      let completed = 0;
      let taskIndex = 0;
      let activeTasks = 0;
      
      // Function to start the next task
      const startNextTask = () => {
        if (taskIndex >= tasks.length || (errors.length > 0 && options.abortOnError)) {
          return;
        }
        
        const worker = this._getAvailableWorker();
        if (!worker) {
          // No worker available, try again later
          setTimeout(startNextTask, 10);
          return;
        }
        
        const currentTaskIndex = taskIndex++;
        const task = tasks[currentTaskIndex];
        
        worker.busy = true;
        worker.lastUsed = Date.now();
        activeTasks++;
        
        if (options.onConcurrentUpdate) {
          options.onConcurrentUpdate(activeTasks);
        }
        
        // Prepare data to send to worker
        const taskData = {
          type: 'task',
          task: processorFn ? { data: task } : task,
          hasProcessor: !!processorFn,
          processorSource: processorFn ? processorFn.toString() : null,
          options: { timeout: options.timeout }
        };
        
        // Set up message handler for this task
        const messageHandler = (message) => {
          if (message.taskId !== currentTaskIndex) return;
          
          worker.worker.removeListener('message', messageHandler);
          worker.worker.removeListener('error', errorHandler);
          
          worker.busy = false;
          activeTasks--;
          completed++;
          
          if (message.error) {
            errors.push({ index: currentTaskIndex, error: new Error(message.error) });
            
            if (options.abortOnError) {
              rejectAll(new Error(`Task ${currentTaskIndex} failed: ${message.error}`));
              return;
            }
          } else {
            results[currentTaskIndex] = message.result;
          }
          
          // Start next task and check if all tasks are completed
          startNextTask();
          checkCompletion();
        };
        
        // Set up error handler for this task
        const errorHandler = (err) => {
          worker.worker.removeListener('message', messageHandler);
          worker.worker.removeListener('error', errorHandler);
          
          worker.busy = false;
          activeTasks--;
          completed++;
          
          errors.push({ index: currentTaskIndex, error: err });
          
          if (options.abortOnError) {
            rejectAll(err);
            return;
          }
          
          // Start next task and check if all tasks are completed
          startNextTask();
          checkCompletion();
        };
        
        // Listen for messages and errors
        worker.worker.once('message', messageHandler);
        worker.worker.once('error', errorHandler);
        
        // Send the task to the worker
        worker.worker.postMessage({ taskId: currentTaskIndex, ...taskData });
      };
      
      // Function to check if all tasks are completed
      const checkCompletion = () => {
        if (completed === tasks.length) {
          if (errors.length > 0 && options.abortOnError) {
            reject(errors[0].error);
          } else {
            resolve(results);
          }
        }
      };
      
      // Function to reject all with an error
      const rejectAll = (error) => {
        // Cleanup any pending tasks
        reject(error);
      };
      
      // Start initial tasks up to maxConcurrent
      for (let i = 0; i < Math.min(options.maxConcurrent, tasks.length); i++) {
        startNextTask();
      }
    });
  }
  
  /**
   * Execute tasks in batches using Promise.all for each batch
   * 
   * @private
   * @param {Array} tasks - Array of tasks
   * @param {Function} processorFn - Function to process each task
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} - Array of results
   */
  async _executeBatched(tasks, processorFn, options) {
    const results = new Array(tasks.length);
    const batches = this.createBatches(
      tasks.map((task, index) => ({ task, index })), 
      options.maxConcurrent
    );
    
    for (const batch of batches) {
      const batchPromises = batch.map(({ task, index }) => {
        return this._executeWithTimeout(
          processorFn ? () => processorFn(task) : task,
          options.timeout
        ).then(result => {
          results[index] = result;
          return result;
        });
      });
      
      if (options.onConcurrentUpdate) {
        options.onConcurrentUpdate(batch.length);
      }
      
      try {
        await Promise.all(batchPromises);
      } catch (error) {
        if (options.abortOnError) {
          throw error;
        }
        // If not aborting on error, continue with next batch
      }
    }
    
    return results;
  }
  
  /**
   * Execute a task with a timeout
   * 
   * @private
   * @param {Function} taskFn - Task function to execute
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<any>} - Task result
   */
  async _executeWithTimeout(taskFn, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task execution timed out after ${timeout}ms`));
      }, timeout);
      
      Promise.resolve()
        .then(() => taskFn())
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  
  /**
   * Process the task queue
   * 
   * @private
   */
  async _processTaskQueue() {
    if (this.isProcessingQueue || this.taskQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      while (this.taskQueue.length > 0) {
        // Process tasks in batches for efficiency
        const tasksToProcess = this.taskQueue.splice(0, this.options.maxConcurrent);
        
        // If we only have a few tasks, process them directly
        if (tasksToProcess.length <= 2) {
          for (const taskItem of tasksToProcess) {
            try {
              const result = await this._processSingleTask(taskItem);
              taskItem.resolve(result);
              this.stats.tasksCompleted++;
            } catch (error) {
              taskItem.reject(error);
              this.stats.tasksFailed++;
            }
          }
        } else {
          // Process a batch of tasks in parallel
          const taskPromises = tasksToProcess.map(taskItem => 
            this._processSingleTask(taskItem)
              .then(result => {
                taskItem.resolve(result);
                this.stats.tasksCompleted++;
              })
              .catch(error => {
                taskItem.reject(error);
                this.stats.tasksFailed++;
              })
          );
          
          await Promise.all(taskPromises);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  /**
   * Process a single task from the queue
   * 
   * @private
   * @param {Object} taskItem - Task item from the queue
   * @returns {Promise<any>} - Task result
   */
  async _processSingleTask(taskItem) {
    const { task, processorFn, options } = taskItem;
    const timeout = options.timeout || this.options.workerTimeout;
    
    const startTime = Date.now();
    const waitTime = startTime - taskItem.submitted;
    
    if (waitTime > 1000) {
      logger.debug(`Task waited ${waitTime}ms in queue before processing`);
    }
    
    try {
      const result = await this._executeWithTimeout(
        processorFn ? () => processorFn(task) : task,
        timeout
      );
      
      this._updateExecutionTimeStats(startTime, 1);
      return result;
    } catch (error) {
      logger.error(`Task execution error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update execution time statistics
   * 
   * @private
   * @param {number} startTime - Start time in milliseconds
   * @param {number} taskCount - Number of tasks completed
   */
  _updateExecutionTimeStats(startTime, taskCount) {
    const executionTime = Date.now() - startTime;
    this.stats.totalExecutionTime += executionTime;
    this.stats.averageExecutionTime = this.stats.totalExecutionTime / this.stats.tasksCompleted;
  }
}

module.exports = ParallelProcessingService;