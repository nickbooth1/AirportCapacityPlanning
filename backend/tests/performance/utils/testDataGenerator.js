/**
 * Test Data Generator
 * 
 * Utility functions to generate test data for performance testing
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a test scenario with specified complexity
 * @param {string} complexity - 'simple', 'moderate', 'complex'
 * @param {object} customParams - Optional custom parameters to include
 * @returns {object} Test scenario object
 */
function generateTestScenario(complexity = 'simple', customParams = {}) {
  const baseScenario = {
    id: uuidv4(),
    name: `Test ${complexity} scenario ${Date.now()}`,
    description: `Performance test scenario with ${complexity} complexity`,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    lastModified: new Date().toISOString(),
    status: 'draft'
  };
  
  let parameters = {};
  
  switch (complexity) {
    case 'simple':
      parameters = {
        type: 'maintenance',
        stands: ['A1', 'A2'],
        startDate: '2025-06-01',
        endDate: '2025-06-03',
      };
      break;
      
    case 'moderate':
      parameters = {
        type: 'capacity_change',
        terminal: 'T1',
        capacityReduction: 0.25,
        startDate: '2025-06-01',
        endDate: '2025-06-14',
        redistributeFlights: true,
        affectedAirlines: ['ABC', 'XYZ'],
      };
      break;
      
    case 'complex':
      parameters = {
        type: 'seasonal_forecast',
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
        }
      };
      break;
      
    default:
      parameters = {
        type: 'maintenance',
        stands: ['A1', 'A2'],
        startDate: '2025-06-01',
        endDate: '2025-06-03'
      };
  }
  
  return {
    ...baseScenario,
    parameters: {
      ...parameters,
      ...customParams
    }
  };
}

/**
 * Generate a list of test scenarios
 * @param {number} count - Number of scenarios to generate
 * @param {object} options - Generation options
 * @returns {Array} Array of test scenarios
 */
function generateScenarioList(count = 10, options = {}) {
  const { complexityDistribution = { simple: 0.6, moderate: 0.3, complex: 0.1 } } = options;
  
  return Array(count).fill().map((_, index) => {
    const random = Math.random();
    let complexity;
    
    if (random < complexityDistribution.simple) {
      complexity = 'simple';
    } else if (random < complexityDistribution.simple + complexityDistribution.moderate) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }
    
    return generateTestScenario(complexity, { 
      id: `test-scenario-${index + 1}`,
      createdAt: new Date(Date.now() - (index * 86400000)).toISOString() // Stagger creation dates
    });
  });
}

/**
 * Generate a test flight schedule
 * @param {number} flightCount - Number of flights to generate
 * @returns {Array} Array of test flights
 */
function generateTestFlightSchedule(flightCount = 100) {
  const airlines = ['ABC', 'XYZ', 'DEF', 'GHI', 'JKL'];
  const aircraftTypes = ['B738', 'A320', 'B77W', 'A388', 'B789', 'A350'];
  const airports = ['LHR', 'CDG', 'AMS', 'FRA', 'MAD', 'FCO', 'IST', 'DXB'];
  
  const startDate = new Date('2025-06-01T00:00:00Z');
  const endDate = new Date('2025-06-07T23:59:59Z');
  const dateRange = endDate.getTime() - startDate.getTime();
  
  return Array(flightCount).fill().map((_, index) => {
    const isArrival = Math.random() > 0.5;
    const flightTime = new Date(startDate.getTime() + Math.random() * dateRange);
    
    // Generate semi-realistic flight number
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNumber = Math.floor(Math.random() * 1000) + 1000;
    
    // Generate semi-realistic data
    const aircraftType = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];
    const origin = isArrival 
      ? airports[Math.floor(Math.random() * airports.length)]
      : 'HOME';
    const destination = isArrival 
      ? 'HOME'
      : airports[Math.floor(Math.random() * airports.length)];
    
    return {
      id: `flight-${index + 1}`,
      flightNumber: `${airline}${flightNumber}`,
      airline,
      aircraftType,
      aircraftCategory: ['B77W', 'A388', 'B789', 'A350'].includes(aircraftType) ? 'wide-body' : 'narrow-body',
      origin,
      destination,
      scheduledTime: flightTime.toISOString(),
      terminal: Math.random() > 0.5 ? 'T1' : 'T2',
      stand: `${String.fromCharCode(65 + Math.floor(Math.random() * 3))}${Math.floor(Math.random() * 10) + 1}`,
      status: 'scheduled'
    };
  });
}

/**
 * Generate scenario impact analysis results
 * @param {object} scenario - The scenario to generate results for
 * @returns {object} Impact analysis results
 */
function generateScenarioImpactResults(scenario) {
  const isCapacityReduction = scenario.parameters.type === 'maintenance' || 
                             (scenario.parameters.capacityReduction && scenario.parameters.capacityReduction > 0);
  
  // Calculate base capacity values
  const baseCapacity = {
    total: 100,
    narrowBody: 70,
    wideBody: 30
  };
  
  // Calculate impact based on scenario type
  let capacityChange = 0;
  
  if (isCapacityReduction) {
    if (scenario.parameters.stands) {
      capacityChange = -1 * scenario.parameters.stands.length * 2;
    } else if (scenario.parameters.capacityReduction) {
      capacityChange = -1 * scenario.parameters.capacityReduction * 100;
    } else {
      capacityChange = -10; // Default reduction
    }
  } else if (scenario.parameters.trafficIncrease) {
    // Traffic increase doesn't directly change capacity but increases utilization
    capacityChange = 0;
  }
  
  // Generate hourly data (24 hours)
  const hourlyCapacity = Array(24).fill().map((_, hour) => {
    // Create a realistic capacity curve with morning and evening peaks
    const baseHourlyCapacity = baseCapacity.total * (0.5 + 0.5 * Math.sin((hour - 6) * Math.PI / 12));
    
    // Apply the change
    const changedHourlyCapacity = Math.max(0, baseHourlyCapacity + (capacityChange * (0.7 + 0.3 * Math.random())));
    
    return {
      hour,
      before: Math.round(baseHourlyCapacity),
      after: Math.round(changedHourlyCapacity),
      difference: Math.round(changedHourlyCapacity - baseHourlyCapacity)
    };
  });
  
  // Generate utilization data
  const baseUtilization = 0.75;
  let utilizationChange;
  
  if (isCapacityReduction) {
    // Reduced capacity increases utilization
    utilizationChange = Math.min(0.25, Math.abs(capacityChange) / baseCapacity.total);
  } else if (scenario.parameters.trafficIncrease) {
    // Increased traffic increases utilization
    utilizationChange = scenario.parameters.trafficIncrease;
  } else {
    utilizationChange = -0.05; // Default improvement
  }
  
  return {
    capacityImpact: {
      before: baseCapacity,
      after: {
        total: baseCapacity.total + capacityChange,
        narrowBody: baseCapacity.narrowBody + (capacityChange * 0.7),
        wideBody: baseCapacity.wideBody + (capacityChange * 0.3)
      },
      difference: {
        total: capacityChange,
        narrowBody: capacityChange * 0.7,
        wideBody: capacityChange * 0.3
      },
      hourlyData: hourlyCapacity
    },
    utilizationImpact: {
      before: baseUtilization,
      after: Math.min(0.99, Math.max(0.1, baseUtilization + utilizationChange)),
      difference: utilizationChange
    },
    conflicts: isCapacityReduction ? Math.floor(Math.abs(capacityChange) / 5) : 0,
    recommendations: generateRecommendations(scenario, capacityChange, utilizationChange)
  };
}

/**
 * Generate recommendations based on scenario impact
 */
function generateRecommendations(scenario, capacityChange, utilizationChange) {
  const recommendations = [];
  
  if (capacityChange < 0) {
    // Capacity reduction recommendations
    recommendations.push({
      type: 'reschedule',
      description: 'Reschedule flights to off-peak hours',
      impact: 'Reduce peak hour demand by up to 15%',
      difficulty: 'medium'
    });
    
    recommendations.push({
      type: 'reallocation',
      description: 'Reallocate affected flights to alternative stands',
      impact: 'Recover up to 80% of lost capacity',
      difficulty: 'medium'
    });
    
    if (Math.abs(capacityChange) > 10) {
      recommendations.push({
        type: 'alternative_airport',
        description: 'Consider temporary reallocation of some flights to nearby airports',
        impact: 'Reduce demand by up to 10%',
        difficulty: 'high'
      });
    }
  }
  
  if (utilizationChange > 0.1) {
    // High utilization recommendations
    recommendations.push({
      type: 'turnaround_optimization',
      description: 'Optimize aircraft turnaround procedures',
      impact: 'Increase effective capacity by up to 8%',
      difficulty: 'medium'
    });
    
    recommendations.push({
      type: 'scheduling_adjustment',
      description: 'Adjust scheduling to smooth demand peaks',
      impact: 'Reduce peak hour congestion by up to 12%',
      difficulty: 'medium'
    });
  }
  
  // Always include at least one general recommendation
  recommendations.push({
    type: 'monitoring',
    description: 'Implement enhanced monitoring of operational performance',
    impact: 'Early detection of bottlenecks and issues',
    difficulty: 'low'
  });
  
  return recommendations;
}

module.exports = {
  generateTestScenario,
  generateScenarioList,
  generateTestFlightSchedule,
  generateScenarioImpactResults
};