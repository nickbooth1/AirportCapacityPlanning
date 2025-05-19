/**
 * processingWorker.js
 * 
 * Worker thread implementation for the ParallelProcessingService.
 * Handles task execution in a separate thread to improve performance
 * and responsiveness of the main application thread.
 */

const { parentPort, workerData } = require('worker_threads');

// Ensure the parent port is available
if (!parentPort) {
  throw new Error('This module must be run as a worker thread');
}

// Track execution time for metrics
let executionTime = 0;
let tasksProcessed = 0;

// Function to execute a task with timeout
async function executeWithTimeout(taskFn, timeout, taskId) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`Task ${taskId} execution timed out after ${timeout}ms`));
    }, timeout);
    
    // Execute the task
    Promise.resolve()
      .then(() => taskFn())
      .then(result => {
        clearTimeout(timeoutId);
        // Track execution time
        executionTime += (Date.now() - startTime);
        tasksProcessed++;
        
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Handle messages from the parent thread
parentPort.on('message', async (data) => {
  const { taskId, type, task, hasProcessor, processorSource, options } = data;
  
  if (type !== 'task') {
    // Handle other message types if needed
    parentPort.postMessage({
      taskId,
      error: 'Unknown message type'
    });
    return;
  }
  
  try {
    let taskToExecute;
    
    // If the task has a processor function, recreate it
    if (hasProcessor) {
      // This is a security risk if accepting messages from untrusted sources
      // For an internal worker this is acceptable
      let processorFn;
      try {
        // Parse the function from its string representation
        // Using indirect eval to get global scope
        const indirectEval = eval;
        processorFn = indirectEval(`(${processorSource})`);
      } catch (evalError) {
        throw new Error(`Failed to parse processor function: ${evalError.message}`);
      }
      
      // Create executable function
      taskToExecute = () => processorFn(task.data);
    } else {
      // The task is already a function or can be executed directly
      taskToExecute = typeof task === 'function' ? task : () => task();
    }
    
    // Execute the task with timeout
    const result = await executeWithTimeout(
      taskToExecute, 
      options.timeout || 30000,
      taskId
    );
    
    // Send the result back to the parent thread
    parentPort.postMessage({
      taskId,
      result,
      executionTime: executionTime / tasksProcessed
    });
  } catch (error) {
    // Send the error back to the parent thread
    parentPort.postMessage({
      taskId,
      error: error.message,
      stack: error.stack
    });
  }
});

// Report readiness to the parent
parentPort.postMessage({ type: 'ready', workerId: workerData?.workerId });

// Handle termination
process.on('unhandledRejection', (reason) => {
  console.error('Worker unhandled rejection:', reason);
  
  // Don't crash, just report the error
  parentPort.postMessage({
    type: 'error',
    error: `Unhandled rejection: ${reason}`
  });
});