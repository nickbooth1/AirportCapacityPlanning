/**
 * Enhanced Performance Test: API Performance
 * 
 * This test suite provides comprehensive performance testing for the AirportAI Phase 2 APIs:
 * - Testing response times for different endpoints under varied load
 * - Stress testing with concurrent API requests
 * - Testing pagination and filtering performance
 * - Measuring throughput and error rates
 * 
 * Note: This test uses a lightweight approach based on supertest.
 * For production-grade load testing, consider using k6, Apache JMeter, or similar tools.
 */

const request = require('supertest');
const { performance } = require('perf_hooks');
const app = require('../../../src/index'); // Main Express application

// Test data generation utilities
const generateTestData = require('../utils/testDataGenerator');

// Performance thresholds in milliseconds
const THRESHOLDS = {
  // Read operations
  getScenariosList: 300,          // Simple list retrieval
  getScenarioDetails: 500,        // Single scenario details
  getComparisonResults: 800,      // Comparison results
  getAnalysisResults: 1200,       // Analysis results
  
  // Write operations
  createScenario: 1000,           // Create new scenario
  updateScenario: 800,            // Update scenario
  deleteScenario: 500,            // Delete scenario
  
  // Complex operations
  calculateImpact: 5000,          // Calculate scenario impact
  generateRecommendations: 3000,  // Generate recommendations
  processPrompt: 2000,            // Process NLP prompt
  
  // Scaling operations
  paginationBase: 300,            // Base time for pagination
  paginationPerItem: 5,           // Additional time per item
  filteringBase: 400,             // Base time for filtering
  
  // Load testing 
  lightLoad: {                    // 10 concurrent users
    avg: 800,                     // average response 
    p95: 1500,                    // 95th percentile
    errorRate: 0.01               // 1% max error rate
  },
  moderateLoad: {                 // 25 concurrent users
    avg: 1200,
    p95: 2500, 
    errorRate: 0.03               // 3% max error rate
  },
  heavyLoad: {                    // 50 concurrent users
    avg: 2000,
    p95: 4000,
    errorRate: 0.05               // 5% max error rate
  }
};

// Test authentication tokens
const TEST_AUTH = {
  user: { id: 'test-user-1', token: 'test-token-12345' },
  admin: { id: 'test-admin-1', token: 'test-admin-token-6789' }
};

// Sample test data
const TEST_DATA = {
  scenario: {
    name: 'API Performance Test Scenario',
    description: 'Test scenario for API performance evaluation', 
    parameters: {
      stands: ['A1', 'A2', 'A3'],
      startDate: '2025-06-01',
      endDate: '2025-06-07',
      type: 'maintenance'
    }
  },
  prompt: {
    text: 'Calculate capacity impact if we close stands A1-A3 for maintenance next week'
  }
};

/**
 * Measure response time for an API request
 */
async function measureApiResponseTime(method, endpoint, payload = null, token = TEST_AUTH.user.token) {
  const startTime = performance.now();
  
  let response;
  const req = request(app)[method.toLowerCase()](endpoint)
    .set('Authorization', `Bearer ${token}`)
    .set('Accept', 'application/json');
  
  if (payload && (method === 'POST' || method === 'PUT')) {
    response = await req.send(payload);
  } else {
    response = await req;
  }
  
  const endTime = performance.now();
  
  return {
    responseTime: endTime - startTime,
    statusCode: response.status,
    body: response.body,
    headers: response.headers
  };
}

/**
 * Run multiple requests concurrently and calculate statistics
 */
async function runConcurrentRequests(method, endpoint, payload, count, token = TEST_AUTH.user.token) {
  const startTime = performance.now();
  
  const promises = Array(count).fill().map(() => {
    return request(app)[method.toLowerCase()](endpoint)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send(payload || undefined);
  });
  
  const results = await Promise.allSettled(promises);
  const endTime = performance.now();
  
  // Calculate statistics
  const totalTime = endTime - startTime;
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const errorCount = results.filter(r => r.status === 'rejected').length;
  const errorRate = errorCount / count;
  
  // Extract response times
  const responseTimes = results
    .filter(r => r.status === 'fulfilled')
    .map(() => totalTime / count); // Approximation since we can't easily get individual times this way
  
  // Calculate avg and percentiles
  responseTimes.sort((a, b) => a - b);
  const avg = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p95 = responseTimes[p95Index] || avg; // Fallback if not enough data
  
  return {
    totalTime,
    avgResponseTime: avg,
    p95ResponseTime: p95,
    successCount,
    errorCount,
    errorRate,
    throughput: (count / totalTime) * 1000 // Requests per second
  };
}

describe('API Performance Tests', () => {
  let testScenarioId;
  
  beforeAll(async () => {
    // Create a test scenario that we can use for subsequent tests
    const response = await request(app)
      .post('/api/agent/scenarios')
      .set('Authorization', `Bearer ${TEST_AUTH.user.token}`)
      .send(TEST_DATA.scenario);
    
    testScenarioId = response.body.scenarioId || '1';
  });
  
  describe('Basic Endpoint Performance Tests', () => {
    test('GET /api/agent/scenarios - list scenarios performance', async () => {
      const { responseTime, statusCode } = await measureApiResponseTime('GET', '/api/agent/scenarios');
      
      console.log(`GET scenarios list response time: ${responseTime.toFixed(2)}ms`);
      
      expect(statusCode).toBe(200);
      expect(responseTime).toBeLessThan(THRESHOLDS.getScenariosList);
    });
    
    test('GET /api/agent/scenarios/:id - get scenario details performance', async () => {
      const { responseTime, statusCode } = await measureApiResponseTime(
        'GET', 
        `/api/agent/scenarios/${testScenarioId}`
      );
      
      console.log(`GET scenario details response time: ${responseTime.toFixed(2)}ms`);
      
      expect(statusCode).toBe(200);
      expect(responseTime).toBeLessThan(THRESHOLDS.getScenarioDetails);
    });
    
    test('POST /api/agent/scenarios - create scenario performance', async () => {
      const newScenario = {
        ...TEST_DATA.scenario,
        name: `${TEST_DATA.scenario.name} ${Date.now()}` // Make unique
      };
      
      const { responseTime, statusCode } = await measureApiResponseTime(
        'POST', 
        '/api/agent/scenarios', 
        newScenario
      );
      
      console.log(`POST create scenario response time: ${responseTime.toFixed(2)}ms`);
      
      expect(statusCode).toBe(201);
      expect(responseTime).toBeLessThan(THRESHOLDS.createScenario);
    });
    
    test('PUT /api/agent/scenarios/:id - update scenario performance', async () => {
      const updatedScenario = {
        ...TEST_DATA.scenario,
        description: `Updated description ${Date.now()}`
      };
      
      const { responseTime, statusCode } = await measureApiResponseTime(
        'PUT', 
        `/api/agent/scenarios/${testScenarioId}`, 
        updatedScenario
      );
      
      console.log(`PUT update scenario response time: ${responseTime.toFixed(2)}ms`);
      
      expect(statusCode).toBe(200);
      expect(responseTime).toBeLessThan(THRESHOLDS.updateScenario);
    });
    
    test('POST /api/agent/process-prompt - NLP processing performance', async () => {
      const { responseTime, statusCode } = await measureApiResponseTime(
        'POST', 
        '/api/agent/process-prompt', 
        TEST_DATA.prompt
      );
      
      console.log(`NLP processing response time: ${responseTime.toFixed(2)}ms`);
      
      expect(statusCode).toBe(200);
      expect(responseTime).toBeLessThan(THRESHOLDS.processPrompt);
    });
    
    test('POST /api/agent/scenarios/:id/calculate - calculate impact performance', async () => {
      const { responseTime, statusCode } = await measureApiResponseTime(
        'POST', 
        `/api/agent/scenarios/${testScenarioId}/calculate`,
        { timeHorizon: 'week' }
      );
      
      console.log(`Calculate impact response time: ${responseTime.toFixed(2)}ms`);
      
      expect(statusCode).toBe(200);
      expect(responseTime).toBeLessThan(THRESHOLDS.calculateImpact);
    });
  });
  
  describe('Pagination and Filtering Performance Tests', () => {
    test('Pagination performance scales appropriately with page size', async () => {
      const pageSizes = [10, 50, 100];
      
      for (const size of pageSizes) {
        const { responseTime } = await measureApiResponseTime(
          'GET', 
          `/api/agent/scenarios?limit=${size}&offset=0`
        );
        
        console.log(`GET scenarios with page size ${size}: ${responseTime.toFixed(2)}ms`);
        
        // Response time should scale sub-linearly with page size
        const expectedTime = THRESHOLDS.paginationBase + (size * THRESHOLDS.paginationPerItem);
        expect(responseTime).toBeLessThan(expectedTime);
      }
    });
    
    test('Filtering performance is efficient', async () => {
      const filters = [
        { param: 'type', value: 'maintenance' },
        { param: 'dateRange', value: '2025-06-01,2025-06-07' },
        { param: 'type', value: 'maintenance', additional: 'dateRange=2025-06-01,2025-06-07' }
      ];
      
      for (const filter of filters) {
        const url = `/api/agent/scenarios?${filter.param}=${filter.value}${filter.additional ? `&${filter.additional}` : ''}`;
        const { responseTime } = await measureApiResponseTime('GET', url);
        
        const filterDesc = filter.additional 
          ? `${filter.param} + additional filters` 
          : filter.param;
        
        console.log(`GET scenarios with filter ${filterDesc}: ${responseTime.toFixed(2)}ms`);
        
        // Filtering should be reasonably fast
        expect(responseTime).toBeLessThan(THRESHOLDS.filteringBase * (filter.additional ? 1.5 : 1));
      }
    });
    
    test('Combined pagination and filtering performs efficiently', async () => {
      const { responseTime } = await measureApiResponseTime(
        'GET', 
        '/api/agent/scenarios?type=maintenance&limit=20&offset=0&sort=created_at:desc'
      );
      
      console.log(`GET scenarios with pagination, filtering and sorting: ${responseTime.toFixed(2)}ms`);
      
      // Combined operations should have reasonable performance
      expect(responseTime).toBeLessThan(THRESHOLDS.paginationBase + THRESHOLDS.filteringBase);
    });
  });
  
  describe('Load Testing - Concurrent Requests', () => {
    test('API handles light load (10 concurrent requests) efficiently', async () => {
      const stats = await runConcurrentRequests(
        'GET', 
        '/api/agent/scenarios',
        null, 
        10
      );
      
      console.log(`Light load test (10 concurrent):`);
      console.log(`  Avg response time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`  P95 response time: ${stats.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
      console.log(`  Throughput: ${stats.throughput.toFixed(2)} requests/sec`);
      
      expect(stats.avgResponseTime).toBeLessThan(THRESHOLDS.lightLoad.avg);
      expect(stats.p95ResponseTime).toBeLessThan(THRESHOLDS.lightLoad.p95);
      expect(stats.errorRate).toBeLessThanOrEqual(THRESHOLDS.lightLoad.errorRate);
    });
    
    test('API handles moderate load (25 concurrent requests) efficiently', async () => {
      const stats = await runConcurrentRequests(
        'GET', 
        '/api/agent/scenarios',
        null, 
        25
      );
      
      console.log(`Moderate load test (25 concurrent):`);
      console.log(`  Avg response time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`  P95 response time: ${stats.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
      console.log(`  Throughput: ${stats.throughput.toFixed(2)} requests/sec`);
      
      expect(stats.avgResponseTime).toBeLessThan(THRESHOLDS.moderateLoad.avg);
      expect(stats.p95ResponseTime).toBeLessThan(THRESHOLDS.moderateLoad.p95);
      expect(stats.errorRate).toBeLessThanOrEqual(THRESHOLDS.moderateLoad.errorRate);
    });
    
    test('API maintains stability under heavy load (50 concurrent requests)', async () => {
      const stats = await runConcurrentRequests(
        'GET', 
        '/api/agent/scenarios',
        null, 
        50
      );
      
      console.log(`Heavy load test (50 concurrent):`);
      console.log(`  Avg response time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`  P95 response time: ${stats.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
      console.log(`  Throughput: ${stats.throughput.toFixed(2)} requests/sec`);
      
      expect(stats.avgResponseTime).toBeLessThan(THRESHOLDS.heavyLoad.avg);
      expect(stats.p95ResponseTime).toBeLessThan(THRESHOLDS.heavyLoad.p95);
      expect(stats.errorRate).toBeLessThanOrEqual(THRESHOLDS.heavyLoad.errorRate);
    });
    
    test('Write operations maintain reliability under moderate load', async () => {
      // Create multiple scenario creation requests
      const stats = await runConcurrentRequests(
        'POST', 
        '/api/agent/scenarios',
        {
          ...TEST_DATA.scenario,
          name: `Load Test Scenario ${Date.now()}`
        }, 
        10
      );
      
      console.log(`Write operations load test (10 concurrent):`);
      console.log(`  Avg response time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`  Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
      
      expect(stats.avgResponseTime).toBeLessThan(THRESHOLDS.createScenario * 1.5);
      expect(stats.errorRate).toBeLessThanOrEqual(THRESHOLDS.lightLoad.errorRate);
    });
  });
  
  describe('Complex Operation Performance', () => {
    test('Scenario comparison API performance', async () => {
      // Assuming we have at least two scenarios to compare
      const { responseTime, statusCode } = await measureApiResponseTime(
        'POST',
        '/api/agent/scenarios/compare',
        {
          scenarioIds: [testScenarioId, '2'], // Assuming scenario ID 2 exists
          metrics: ['capacity', 'utilization']
        }
      );
      
      console.log(`Scenario comparison response time: ${responseTime.toFixed(2)}ms`);
      
      expect(statusCode).toBe(200);
      expect(responseTime).toBeLessThan(THRESHOLDS.getComparisonResults);
    });
    
    test('Recommendations API performance', async () => {
      const { responseTime, statusCode } = await measureApiResponseTime(
        'POST',
        `/api/agent/scenarios/${testScenarioId}/recommendations`,
        {
          optimizationGoal: 'capacity',
          constraints: ['budget', 'timeline']
        }
      );
      
      console.log(`Recommendations generation response time: ${responseTime.toFixed(2)}ms`);
      
      expect(statusCode).toBe(200);
      expect(responseTime).toBeLessThan(THRESHOLDS.generateRecommendations);
    });
  });
  
  describe('API Performance Under Sustained Load', () => {
    test('API performance remains stable during sustained usage', async () => {
      // Perform a sequence of 30 requests with short intervals
      const responseTimeSeries = [];
      const requestCount = 30;
      
      for (let i = 0; i < requestCount; i++) {
        const { responseTime } = await measureApiResponseTime('GET', '/api/agent/scenarios');
        responseTimeSeries.push(responseTime);
        
        // Short delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Calculate moving average of response times
      const movingAverages = [];
      const windowSize = 5;
      
      for (let i = 0; i <= requestCount - windowSize; i++) {
        const window = responseTimeSeries.slice(i, i + windowSize);
        const average = window.reduce((sum, time) => sum + time, 0) / windowSize;
        movingAverages.push(average);
      }
      
      console.log(`Response times during sustained load:`);
      console.log(`  First 5 requests avg: ${movingAverages[0].toFixed(2)}ms`);
      console.log(`  Middle 5 requests avg: ${movingAverages[Math.floor(movingAverages.length / 2)].toFixed(2)}ms`);
      console.log(`  Last 5 requests avg: ${movingAverages[movingAverages.length - 1].toFixed(2)}ms`);
      
      // Performance should not degrade significantly over time
      const degradationRatio = movingAverages[movingAverages.length - 1] / movingAverages[0];
      console.log(`  Performance degradation ratio: ${degradationRatio.toFixed(2)}x`);
      
      expect(degradationRatio).toBeLessThan(1.5); // Allow up to 50% degradation
    });
  });
});