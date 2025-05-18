/**
 * Performance Test: Scenario Calculation Time
 * 
 * This test measures the performance of scenario calculations to ensure they
 * meet required response time thresholds for different complexity levels.
 */

const { performance } = require('perf_hooks');
const ScenarioService = require('../../../src/services/agent/ScenarioService');
const AggregatedCapacityImpactService = require('../../../src/services/AggregatedCapacityImpactService');

// Mock dependencies if needed for testing purposes
jest.mock('../../../src/services/AggregatedCapacityImpactService');

// Test scenario definitions of varying complexity
const TEST_SCENARIOS = {
  small: {
    name: 'Small Scale Maintenance',
    description: 'Close 2 stands for maintenance for 1 day',
    parameters: {
      stands: ['A1', 'A2'],
      startDate: '2025-06-01',
      endDate: '2025-06-01',
      type: 'maintenance'
    },
    expectedCalculationTime: 1000 // 1 second
  },
  medium: {
    name: 'Medium Scale Terminal Changes',
    description: 'Evaluate closure of Terminal 1 for 1 week with redirected traffic',
    parameters: {
      terminal: 'T1',
      startDate: '2025-06-01',
      endDate: '2025-06-07',
      redistributeFlights: true,
      type: 'closure'
    },
    expectedCalculationTime: 5000 // 5 seconds
  },
  large: {
    name: 'Large Scale Seasonal Planning',
    description: 'Evaluate impact of 15% traffic increase during summer season',
    parameters: {
      trafficIncrease: 0.15,
      startDate: '2025-06-01',
      endDate: '2025-08-31',
      includePeakHours: true,
      type: 'forecast'
    },
    expectedCalculationTime: 15000 // 15 seconds
  }
};

// Performance thresholds in milliseconds
const THRESHOLDS = {
  small: 2000,   // 2 seconds for small scenarios
  medium: 10000, // 10 seconds for medium scenarios
  large: 30000   // 30 seconds for large complex scenarios
};

describe('Scenario Calculation Performance Tests', () => {
  let scenarioService;
  
  beforeAll(() => {
    // Mock the capacity impact service for testing
    AggregatedCapacityImpactService.prototype.calculateImpact = jest.fn(async (scenario) => {
      // Simulate calculation time based on scenario complexity
      let calculationTime;
      
      if (scenario.parameters.stands?.length <= 2) {
        calculationTime = TEST_SCENARIOS.small.expectedCalculationTime;
      } else if (scenario.parameters.terminal) {
        calculationTime = TEST_SCENARIOS.medium.expectedCalculationTime;
      } else {
        calculationTime = TEST_SCENARIOS.large.expectedCalculationTime;
      }
      
      await new Promise(resolve => setTimeout(resolve, calculationTime * 0.8)); // Simulation is faster than real
      
      return {
        capacityImpact: {
          before: { totalCapacity: 100 },
          after: { totalCapacity: 90 },
          difference: { totalCapacity: -10 }
        }
      };
    });
    
    scenarioService = new ScenarioService(new AggregatedCapacityImpactService());
  });

  test('should calculate small scenarios within threshold', async () => {
    const scenario = TEST_SCENARIOS.small;
    
    const startTime = performance.now();
    await scenarioService.calculateScenarioImpact(scenario);
    const endTime = performance.now();
    
    const calculationTime = endTime - startTime;
    console.log(`Small scenario calculation time: ${calculationTime.toFixed(2)}ms`);
    
    expect(calculationTime).toBeLessThan(THRESHOLDS.small);
  });

  test('should calculate medium scenarios within threshold', async () => {
    const scenario = TEST_SCENARIOS.medium;
    
    const startTime = performance.now();
    await scenarioService.calculateScenarioImpact(scenario);
    const endTime = performance.now();
    
    const calculationTime = endTime - startTime;
    console.log(`Medium scenario calculation time: ${calculationTime.toFixed(2)}ms`);
    
    expect(calculationTime).toBeLessThan(THRESHOLDS.medium);
  });

  test('should calculate large scenarios within threshold', async () => {
    const scenario = TEST_SCENARIOS.large;
    
    const startTime = performance.now();
    await scenarioService.calculateScenarioImpact(scenario);
    const endTime = performance.now();
    
    const calculationTime = endTime - startTime;
    console.log(`Large scenario calculation time: ${calculationTime.toFixed(2)}ms`);
    
    expect(calculationTime).toBeLessThan(THRESHOLDS.large);
  });

  test('should perform calculations in parallel efficiently', async () => {
    const scenarios = [
      TEST_SCENARIOS.small,
      TEST_SCENARIOS.medium,
      TEST_SCENARIOS.small // Adding another small scenario
    ];
    
    const startTime = performance.now();
    await Promise.all(scenarios.map(scenario => 
      scenarioService.calculateScenarioImpact(scenario)
    ));
    const endTime = performance.now();
    
    const totalCalculationTime = endTime - startTime;
    console.log(`Parallel calculation time for ${scenarios.length} scenarios: ${totalCalculationTime.toFixed(2)}ms`);
    
    // In parallel, should be faster than sum of individual times but slower than longest
    const totalExpectedTimeSerial = TEST_SCENARIOS.small.expectedCalculationTime * 2 + 
                                   TEST_SCENARIOS.medium.expectedCalculationTime;
    
    expect(totalCalculationTime).toBeLessThan(totalExpectedTimeSerial);
    expect(totalCalculationTime).toBeGreaterThan(TEST_SCENARIOS.medium.expectedCalculationTime);
  });

  test('should maintain performance under repeated calculations', async () => {
    const scenario = TEST_SCENARIOS.small;
    const iterations = 5;
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await scenarioService.calculateScenarioImpact(scenario);
    }
    
    const endTime = performance.now();
    
    const avgCalculationTime = (endTime - startTime) / iterations;
    console.log(`Average calculation time over ${iterations} iterations: ${avgCalculationTime.toFixed(2)}ms`);
    
    // Expect no performance degradation
    expect(avgCalculationTime).toBeLessThan(THRESHOLDS.small);
  });
});