/**
 * Manual mock for ScenarioCalculation model
 */

const calculationQueryMethods = {
  findById: jest.fn().mockImplementation((id) => {
    if (id) {
      return Promise.resolve({
        id: id,
        scenarioId: 'scenario-123',
        status: 'completed',
        type: 'standard',
        options: {},
        results: {
          capacity: {
            narrowBodyCapacity: 80,
            wideBodyCapacity: 40,
            totalCapacity: 120,
            utilisationRate: 0.75
          },
          capacityByHour: [
            { hour: 8, capacity: 10, utilization: 0.9 },
            { hour: 9, capacity: 12, utilization: 0.85 }
          ],
          utilizationMetrics: {
            overallUtilization: 0.75,
            peakUtilization: 0.9,
            offPeakUtilization: 0.6
          }
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: null
      });
    }
    return Promise.resolve(null);
  }),
  insert: jest.fn().mockImplementation((data) => Promise.resolve({
    id: data.id || 'calculation-123',
    ...data
  }))
};

const mockCalculation = {
  id: 'calculation-123',
  scenarioId: 'scenario-123',
  status: 'pending',
  type: 'standard',
  options: {},
  results: null,
  startedAt: new Date().toISOString(),
  completedAt: null,
  errorMessage: null,
  
  // Methods
  startProcessing: jest.fn().mockResolvedValue(true),
  complete: jest.fn().mockImplementation((results) => Promise.resolve({
    id: 'calculation-123',
    status: 'completed',
    results,
    completedAt: new Date().toISOString()
  })),
  fail: jest.fn().mockImplementation((errorMessage) => Promise.resolve({
    id: 'calculation-123',
    status: 'failed',
    errorMessage,
    completedAt: new Date().toISOString()
  })),
  
  // Query methods
  query: jest.fn().mockReturnValue(calculationQueryMethods)
};

const ScenarioCalculation = jest.fn().mockImplementation(() => mockCalculation);
ScenarioCalculation.query = jest.fn().mockReturnValue(calculationQueryMethods);

module.exports = ScenarioCalculation;