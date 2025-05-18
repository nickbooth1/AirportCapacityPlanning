/**
 * Performance Test: API Response Time
 * 
 * This test measures the performance of the API endpoints for the AirportAI agent
 * to ensure they meet response time requirements under various load conditions.
 * We use a lightweight version of load testing here. For more comprehensive
 * testing, consider using k6, Apache JMeter, or similar tools.
 */

const request = require('supertest');
const { performance } = require('perf_hooks');
const app = require('../../../src/index'); // Main Express application

// Response time thresholds in milliseconds
const THRESHOLDS = {
  singleRequest: {
    processingPrompt: 1000,    // 1s for NLP endpoint
    getScenarios: 300,         // 300ms for listing scenarios
    getScenarioById: 500,      // 500ms for retrieving a specific scenario
    createScenario: 1500,      // 1.5s for creating a new scenario
    calculateImpact: 5000      // 5s for calculating scenario impact
  },
  concurrentRequests: {
    low: 1500,     // 1.5s for 10 concurrent requests 
    medium: 3000,  // 3s for 25 concurrent requests
    high: 6000     // 6s for 50 concurrent requests
  }
};

// Test user for authentication purposes
const TEST_USER = {
  id: 'test-user-1',
  token: 'test-token-12345'
};

// Helper function to measure response time
async function measureEndpointResponseTime(method, endpoint, payload = null) {
  const startTime = performance.now();
  
  let response;
  if (method === 'GET') {
    response = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${TEST_USER.token}`);
  } else if (method === 'POST') {
    response = await request(app)
      .post(endpoint)
      .send(payload)
      .set('Authorization', `Bearer ${TEST_USER.token}`);
  }
  
  const endTime = performance.now();
  const responseTime = endTime - startTime;
  
  return {
    responseTime,
    statusCode: response.statusCode,
    body: response.body
  };
}

// Helper for concurrent requests
async function makeConcurrentRequests(method, endpoint, payload, count) {
  const startTime = performance.now();
  
  const requests = Array(count).fill().map(() => {
    if (method === 'GET') {
      return request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${TEST_USER.token}`);
    } else {
      return request(app)
        .post(endpoint)
        .send(payload)
        .set('Authorization', `Bearer ${TEST_USER.token}`);
    }
  });
  
  await Promise.all(requests);
  
  const endTime = performance.now();
  return endTime - startTime;
}

describe('API Response Time Performance Tests', () => {
  // Mock data for testing
  const samplePrompt = {
    text: 'Calculate capacity impact if we close stands A1-A5 for maintenance next week'
  };
  
  const sampleScenario = {
    name: 'Test Maintenance Scenario',
    description: 'Close stands A1-A5 for maintenance',
    parameters: {
      stands: ['A1', 'A2', 'A3', 'A4', 'A5'],
      startDate: '2025-06-01',
      endDate: '2025-06-07',
      type: 'maintenance'
    }
  };

  test('NLP endpoint response time for processing a prompt', async () => {
    const { responseTime, statusCode } = await measureEndpointResponseTime(
      'POST', 
      '/api/agent/process-prompt', 
      samplePrompt
    );
    
    console.log(`NLP processing endpoint response time: ${responseTime.toFixed(2)}ms`);
    
    expect(statusCode).toBe(200);
    expect(responseTime).toBeLessThan(THRESHOLDS.singleRequest.processingPrompt);
  });

  test('GET scenarios endpoint response time', async () => {
    const { responseTime, statusCode } = await measureEndpointResponseTime(
      'GET', 
      '/api/agent/scenarios'
    );
    
    console.log(`GET scenarios endpoint response time: ${responseTime.toFixed(2)}ms`);
    
    expect(statusCode).toBe(200);
    expect(responseTime).toBeLessThan(THRESHOLDS.singleRequest.getScenarios);
  });

  test('GET scenario by ID endpoint response time', async () => {
    // Assuming a scenario with ID 1 exists
    const { responseTime, statusCode } = await measureEndpointResponseTime(
      'GET', 
      '/api/agent/scenarios/1'
    );
    
    console.log(`GET scenario by ID endpoint response time: ${responseTime.toFixed(2)}ms`);
    
    expect(statusCode).toBe(200);
    expect(responseTime).toBeLessThan(THRESHOLDS.singleRequest.getScenarioById);
  });

  test('POST create scenario endpoint response time', async () => {
    const { responseTime, statusCode } = await measureEndpointResponseTime(
      'POST', 
      '/api/agent/scenarios', 
      sampleScenario
    );
    
    console.log(`Create scenario endpoint response time: ${responseTime.toFixed(2)}ms`);
    
    expect(statusCode).toBe(201);
    expect(responseTime).toBeLessThan(THRESHOLDS.singleRequest.createScenario);
  });

  test('POST calculate impact endpoint response time', async () => {
    const { responseTime, statusCode } = await measureEndpointResponseTime(
      'POST', 
      '/api/agent/scenarios/calculate-impact',
      sampleScenario
    );
    
    console.log(`Calculate impact endpoint response time: ${responseTime.toFixed(2)}ms`);
    
    expect(statusCode).toBe(200);
    expect(responseTime).toBeLessThan(THRESHOLDS.singleRequest.calculateImpact);
  });

  // Load testing with increasing concurrency
  test('API performance under low concurrency (10 requests)', async () => {
    const totalTime = await makeConcurrentRequests(
      'GET',
      '/api/agent/scenarios',
      null,
      10
    );
    
    const avgResponseTime = totalTime / 10;
    console.log(`Average response time under low concurrency (10 requests): ${avgResponseTime.toFixed(2)}ms`);
    
    expect(avgResponseTime).toBeLessThan(THRESHOLDS.concurrentRequests.low);
  });

  test('API performance under medium concurrency (25 requests)', async () => {
    const totalTime = await makeConcurrentRequests(
      'GET',
      '/api/agent/scenarios',
      null,
      25
    );
    
    const avgResponseTime = totalTime / 25;
    console.log(`Average response time under medium concurrency (25 requests): ${avgResponseTime.toFixed(2)}ms`);
    
    expect(avgResponseTime).toBeLessThan(THRESHOLDS.concurrentRequests.medium);
  });

  test('API performance under high concurrency (50 requests)', async () => {
    const totalTime = await makeConcurrentRequests(
      'GET',
      '/api/agent/scenarios',
      null,
      50
    );
    
    const avgResponseTime = totalTime / 50;
    console.log(`Average response time under high concurrency (50 requests): ${avgResponseTime.toFixed(2)}ms`);
    
    expect(avgResponseTime).toBeLessThan(THRESHOLDS.concurrentRequests.high);
  });

  // Additional test for resource-intensive endpoint under load
  test('Calculate impact endpoint under moderate load (5 concurrent)', async () => {
    const totalTime = await makeConcurrentRequests(
      'POST',
      '/api/agent/scenarios/calculate-impact',
      sampleScenario,
      5
    );
    
    const avgResponseTime = totalTime / 5;
    console.log(`Average calculate impact response time (5 concurrent): ${avgResponseTime.toFixed(2)}ms`);
    
    // For calculation endpoint, tolerance is higher
    expect(avgResponseTime).toBeLessThan(THRESHOLDS.singleRequest.calculateImpact * 1.5);
  });
});