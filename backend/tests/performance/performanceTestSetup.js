/**
 * Setup file for performance tests
 */

// Increase Jest timeout for all performance tests
jest.setTimeout(120000); // 2 minutes

// Global performance test context
global.performanceContext = {
  metrics: {},
  startTime: Date.now()
};

// Add performance measurement utilities
global.measurePerformance = async (name, fn) => {
  const startTime = process.hrtime.bigint();
  const result = await fn();
  const endTime = process.hrtime.bigint();
  
  const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds
  
  // Store metric
  if (!global.performanceContext.metrics[name]) {
    global.performanceContext.metrics[name] = [];
  }
  
  global.performanceContext.metrics[name].push(duration);
  
  return { result, duration };
};

// Report memory usage
global.reportMemoryUsage = (label) => {
  const memoryUsage = process.memoryUsage();
  
  console.log(`Memory Usage (${label}):`);
  console.log(`  Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
  console.log(`  Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
  console.log(`  RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
  
  return memoryUsage;
};

// Save metrics after all tests complete
afterAll(() => {
  const totalDuration = Date.now() - global.performanceContext.startTime;
  
  console.log(`\nPerformance Test Run Summary:`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
  
  // Calculate statistics for each metric
  Object.entries(global.performanceContext.metrics).forEach(([name, measurements]) => {
    if (measurements.length === 0) return;
    
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    const avg = sum / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    
    // Calculate standard deviation
    const variance = measurements.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / measurements.length;
    const stdDev = Math.sqrt(variance);
    
    console.log(`\nMetric: ${name}`);
    console.log(`  Count: ${measurements.length}`);
    console.log(`  Avg: ${avg.toFixed(2)} ms`);
    console.log(`  Min: ${min.toFixed(2)} ms`);
    console.log(`  Max: ${max.toFixed(2)} ms`);
    console.log(`  StdDev: ${stdDev.toFixed(2)} ms`);
  });
});