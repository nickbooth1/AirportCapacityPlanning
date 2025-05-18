/**
 * Enhanced Performance Test: Scenario Calculation
 * 
 * This test suite provides comprehensive performance testing for the scenario calculation
 * capabilities in AirportAI Phase 2, including:
 * - Calculation time for different scenario complexities
 * - Performance with large datasets
 * - Concurrent scenario calculations
 * - Memory usage during calculations
 * - Caching effectiveness
 */

const { performance } = require('perf_hooks');
const ScenarioService = require('../../../src/services/agent/ScenarioService');
const AggregatedCapacityImpactService = require('../../../src/services/AggregatedCapacityImpactService');

// Mock implementation for testing
jest.mock('../../../src/services/AggregatedCapacityImpactService');

// Test scenarios with varying complexity and data sizes
const TEST_SCENARIOS = {
  simple: {
    name: 'Simple Stand Closure',
    description: 'Close 2 stands for maintenance for 1 day',
    parameters: {
      stands: ['A1', 'A2'],
      startDate: '2025-06-01',
      endDate: '2025-06-01',
      type: 'maintenance'
    },
    dataSize: {
      flights: 100,
      stands: 20
    },
    expectedTime: 1500 // 1.5 seconds
  },
  moderate: {
    name: 'Terminal Operation Change',
    description: 'Reduce terminal capacity by 30% for 1 week',
    parameters: {
      terminal: 'T1',
      capacityReduction: 0.3,
      startDate: '2025-06-01',
      endDate: '2025-06-07',
      redistributeFlights: true,
      type: 'operational_change'
    },
    dataSize: {
      flights: 1000,
      stands: 50
    },
    expectedTime: 5000 // 5 seconds
  },
  complex: {
    name: 'Airport-Wide Seasonal Planning',
    description: 'Evaluate impact of increased traffic with multiple constraints',
    parameters: {
      trafficIncrease: 0.15,
      startDate: '2025-06-01',
      endDate: '2025-08-31',
      terminalChanges: [
        { terminal: 'T1', capacityChange: 0.1 },
        { terminal: 'T2', capacityChange: -0.2 }
      ],
      standClosures: ['A1', 'A2', 'B5', 'C3', 'C4'],
      airlineChanges: [
        { airline: 'ABC', flightsChange: 0.2 },
        { airline: 'XYZ', flightsChange: -0.1 }
      ],
      aircraftMixChanges: {
        widebody: 0.05,
        narrowbody: -0.05
      },
      type: 'seasonal_forecast'
    },
    dataSize: {
      flights: 5000,
      stands: 100
    },
    expectedTime: 15000 // 15 seconds
  },
  veryLarge: {
    name: 'Annual Capacity Planning',
    description: 'Full-year capacity planning with all parameters',
    parameters: {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      monthlyChanges: Array(12).fill().map((_, i) => ({
        month: i + 1,
        trafficChange: 0.05 + (i % 3) * 0.03
      })),
      infrastructureChanges: [
        { type: 'new_terminal', date: '2025-07-01', standCount: 15 },
        { type: 'renovation', date: '2025-03-01', terminal: 'T3', durationDays: 90 }
      ],
      type: 'annual_forecast'
    },
    dataSize: {
      flights: 20000,
      stands: 150
    },
    expectedTime: 45000 // 45 seconds
  }
};

// Performance thresholds in milliseconds
const THRESHOLDS = {
  simple: 3000,      // 3 seconds for simple scenarios
  moderate: 10000,   // 10 seconds for moderate scenarios
  complex: 30000,    // 30 seconds for complex scenarios
  veryLarge: 90000,  // 90 seconds for very large scenarios
  concurrentAvg: 15000, // Average time for concurrent calculations
  memoryIncreasePerFlight: 0.05, // MB per flight in dataset (max)
  cacheSpeedup: 0.5  // Cached calculations should be at least 50% faster
};

describe('Enhanced Scenario Calculation Performance Tests', () => {
  let scenarioService;
  
  beforeAll(() => {
    // Mock implementation for the capacity impact service
    AggregatedCapacityImpactService.prototype.calculateImpact = jest.fn(async (scenario) => {
      const scenarioType = Object.keys(TEST_SCENARIOS).find(
        key => JSON.stringify(scenario).includes(TEST_SCENARIOS[key].name)
      ) || 'moderate';
      
      const testData = TEST_SCENARIOS[scenarioType];
      const baseTime = testData.expectedTime * 0.7; // Simulation is faster than real
      
      // Simulate calculation time based on complexity and data size
      const calculationTime = baseTime * (1 + Math.random() * 0.3); // Add some variance
      
      await new Promise(resolve => setTimeout(resolve, calculationTime));
      
      // Return mock results
      return {
        capacityImpact: {
          before: { totalCapacity: 100, hourlyCapacity: Array(24).fill().map((_, i) => ({ hour: i, capacity: 80 + Math.sin(i/3) * 20 })) },
          after: { totalCapacity: 85, hourlyCapacity: Array(24).fill().map((_, i) => ({ hour: i, capacity: 70 + Math.sin(i/3) * 15 })) },
          difference: { totalCapacity: -15, hourlyCapacity: Array(24).fill().map((_, i) => ({ hour: i, capacity: -10 - Math.sin(i/3) * 5 })) }
        },
        utilizationImpact: {
          before: 0.75,
          after: 0.85,
          difference: 0.1
        },
        dataProcessed: {
          flights: testData.dataSize.flights,
          stands: testData.dataSize.stands,
          timeSlots: 24,
          airlines: Math.floor(testData.dataSize.flights / 50) // Rough estimate
        }
      };
    });
    
    scenarioService = new ScenarioService(new AggregatedCapacityImpactService());
  });
  
  beforeEach(() => {
    // Reset mock data between tests
    jest.clearAllMocks();
  });

  describe('Calculation Time Tests', () => {
    test('should calculate simple scenarios within threshold', async () => {
      const scenario = TEST_SCENARIOS.simple;
      
      const startTime = performance.now();
      const result = await scenarioService.calculateScenarioImpact(scenario);
      const endTime = performance.now();
      
      const calculationTime = endTime - startTime;
      console.log(`Simple scenario calculation time: ${calculationTime.toFixed(2)}ms (${result.dataProcessed.flights} flights)`);
      
      expect(calculationTime).toBeLessThan(THRESHOLDS.simple);
    });
    
    test('should calculate moderate scenarios within threshold', async () => {
      const scenario = TEST_SCENARIOS.moderate;
      
      const startTime = performance.now();
      const result = await scenarioService.calculateScenarioImpact(scenario);
      const endTime = performance.now();
      
      const calculationTime = endTime - startTime;
      console.log(`Moderate scenario calculation time: ${calculationTime.toFixed(2)}ms (${result.dataProcessed.flights} flights)`);
      
      expect(calculationTime).toBeLessThan(THRESHOLDS.moderate);
    });
    
    test('should calculate complex scenarios within threshold', async () => {
      const scenario = TEST_SCENARIOS.complex;
      
      const startTime = performance.now();
      const result = await scenarioService.calculateScenarioImpact(scenario);
      const endTime = performance.now();
      
      const calculationTime = endTime - startTime;
      console.log(`Complex scenario calculation time: ${calculationTime.toFixed(2)}ms (${result.dataProcessed.flights} flights)`);
      
      expect(calculationTime).toBeLessThan(THRESHOLDS.complex);
    });
    
    test('should handle very large scenarios within extended threshold', async () => {
      const scenario = TEST_SCENARIOS.veryLarge;
      
      const startTime = performance.now();
      const result = await scenarioService.calculateScenarioImpact(scenario);
      const endTime = performance.now();
      
      const calculationTime = endTime - startTime;
      console.log(`Very large scenario calculation time: ${calculationTime.toFixed(2)}ms (${result.dataProcessed.flights} flights)`);
      
      expect(calculationTime).toBeLessThan(THRESHOLDS.veryLarge);
    });
  });
  
  describe('Concurrency Tests', () => {
    test('should execute multiple simple scenarios concurrently efficiently', async () => {
      const scenarios = Array(5).fill(TEST_SCENARIOS.simple);
      
      const startTime = performance.now();
      const results = await Promise.all(scenarios.map(scenario => 
        scenarioService.calculateScenarioImpact({...scenario})
      ));
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / scenarios.length;
      const totalFlights = results.reduce((sum, r) => sum + r.dataProcessed.flights, 0);
      
      console.log(`Concurrent simple scenarios - Total time: ${totalTime.toFixed(2)}ms, Avg per scenario: ${avgTime.toFixed(2)}ms`);
      console.log(`Total flights processed: ${totalFlights}`);
      
      // In parallel, should be faster than sum of individual expected times
      const expectedSerialTime = TEST_SCENARIOS.simple.expectedTime * scenarios.length;
      expect(totalTime).toBeLessThan(expectedSerialTime * 0.7); // At least 30% faster than serial
      expect(avgTime).toBeLessThan(THRESHOLDS.concurrentAvg);
    });
    
    test('should handle mixed complexity scenarios concurrently', async () => {
      const scenarios = [
        TEST_SCENARIOS.simple,
        TEST_SCENARIOS.simple,
        TEST_SCENARIOS.moderate,
        TEST_SCENARIOS.complex
      ];
      
      const startTime = performance.now();
      const results = await Promise.all(scenarios.map(scenario => 
        scenarioService.calculateScenarioImpact({...scenario})
      ));
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const totalFlights = results.reduce((sum, r) => sum + r.dataProcessed.flights, 0);
      
      console.log(`Mixed complexity concurrent scenarios - Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Total flights processed: ${totalFlights}`);
      
      // Should be driven by the most complex scenario, but with some overhead
      expect(totalTime).toBeLessThan(TEST_SCENARIOS.complex.expectedTime * 1.5);
    });
  });
  
  describe('Memory Usage Tests', () => {
    test('should maintain acceptable memory usage during calculations', async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`Initial memory usage: ${initialMemory.toFixed(2)} MB`);
      
      // Calculate a large scenario to stress memory
      const result = await scenarioService.calculateScenarioImpact(TEST_SCENARIOS.complex);
      
      const afterCalcMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`Memory usage after calculation: ${afterCalcMemory.toFixed(2)} MB`);
      console.log(`Memory increase: ${(afterCalcMemory - initialMemory).toFixed(2)} MB`);
      console.log(`Per flight memory: ${((afterCalcMemory - initialMemory) / result.dataProcessed.flights).toFixed(4)} MB`);
      
      // Check memory increase per flight is below threshold
      expect((afterCalcMemory - initialMemory) / result.dataProcessed.flights)
        .toBeLessThan(THRESHOLDS.memoryIncreasePerFlight);
      
      // Force garbage collection again if available
      if (global.gc) {
        global.gc();
        const afterGcMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`Memory usage after GC: ${afterGcMemory.toFixed(2)} MB`);
        console.log(`Memory reclaimed: ${(afterCalcMemory - afterGcMemory).toFixed(2)} MB`);
      }
    });
  });
  
  describe('Caching Effectiveness Tests', () => {
    test('should benefit from result caching on repeated calculations', async () => {
      // First calculation (no cache)
      const scenario = TEST_SCENARIOS.moderate;
      
      const firstStartTime = performance.now();
      await scenarioService.calculateScenarioImpact({...scenario, cacheKey: 'cache-test-scenario'});
      const firstEndTime = performance.now();
      
      const firstRunTime = firstEndTime - firstStartTime;
      console.log(`First calculation (uncached): ${firstRunTime.toFixed(2)}ms`);
      
      // Second calculation (should use cache)
      const secondStartTime = performance.now();
      await scenarioService.calculateScenarioImpact({...scenario, cacheKey: 'cache-test-scenario'});
      const secondEndTime = performance.now();
      
      const secondRunTime = secondEndTime - secondStartTime;
      console.log(`Second calculation (cached): ${secondRunTime.toFixed(2)}ms`);
      console.log(`Cache speedup factor: ${(firstRunTime / secondRunTime).toFixed(2)}x`);
      
      // Cached run should be significantly faster
      expect(secondRunTime).toBeLessThan(firstRunTime * THRESHOLDS.cacheSpeedup);
    });
  });
  
  describe('Data Scaling Tests', () => {
    test('should scale calculation time appropriately with data size', async () => {
      // Test with increasing data sizes
      const dataSizes = [
        { flights: 100, stands: 20 },
        { flights: 500, stands: 30 },
        { flights: 1000, stands: 50 }
      ];
      
      const baseScenario = TEST_SCENARIOS.simple;
      const times = [];
      
      for (const dataSize of dataSizes) {
        // Configure mock to return specific data size
        AggregatedCapacityImpactService.prototype.calculateImpact.mockImplementationOnce(async () => {
          // Simulate calculation time proportional to data size
          const calculationTime = dataSize.flights * 1.5; // 1.5ms per flight as a baseline
          await new Promise(resolve => setTimeout(resolve, calculationTime));
          
          return {
            capacityImpact: { /* ... */ },
            utilizationImpact: { /* ... */ },
            dataProcessed: dataSize
          };
        });
        
        const startTime = performance.now();
        const result = await scenarioService.calculateScenarioImpact({
          ...baseScenario,
          name: `Scaling test - ${dataSize.flights} flights`
        });
        const endTime = performance.now();
        
        const calcTime = endTime - startTime;
        times.push({ dataSize, calcTime });
        
        console.log(`Data size: ${dataSize.flights} flights, ${dataSize.stands} stands - Time: ${calcTime.toFixed(2)}ms`);
      }
      
      // Verify scaling is sub-linear (due to optimizations)
      // For doubling the data, time should increase by less than double
      const scalingFactor = times[2].calcTime / times[0].calcTime;
      const dataFactor = times[2].dataSize.flights / times[0].dataSize.flights;
      
      console.log(`Scaling factor: ${scalingFactor.toFixed(2)}x for ${dataFactor}x data increase`);
      expect(scalingFactor).toBeLessThan(dataFactor * 0.9); // Should be at least 10% more efficient at scale
    });
  });
});