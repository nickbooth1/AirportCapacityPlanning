/**
 * Mock Aggregated Capacity Impact Service for testing
 */

class AggregatedCapacityImpactService {
  /**
   * Calculate the capacity impact for a scenario
   */
  async calculateImpact(scenario) {
    return {
      impactScore: 0.75,
      aircraftCapacityImpact: {
        narrowBody: -5,
        wideBody: -2,
        regional: -1
      },
      terminalImpact: {
        'Terminal 1': 0.8,
        'Terminal 2': 0.6
      },
      peakHourImpact: {
        startTime: '10:00',
        endTime: '12:00',
        reductionPercentage: 15
      },
      alternativeSolutions: [
        {
          description: 'Reschedule maintenance to off-peak hours',
          capacityGain: 0.12,
          implementationComplexity: 'medium'
        }
      ]
    };
  }

  /**
   * Get historical capacity impact data
   */
  async getHistoricalImpact(startDate, endDate, filters = {}) {
    return {
      dailyImpact: [
        { date: '2025-06-01', impactScore: 0.7 },
        { date: '2025-06-02', impactScore: 0.5 },
        { date: '2025-06-03', impactScore: 0.3 }
      ],
      averageImpact: 0.5,
      peakImpact: 0.7
    };
  }
}

module.exports = new AggregatedCapacityImpactService();