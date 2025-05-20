/**
 * Manual mock for ScenarioComparison model
 */

const comparisonQueryMethods = {
  findById: jest.fn().mockImplementation((id) => {
    if (id) {
      return Promise.resolve({
        id: id,
        scenarioIds: ['scenario-123', 'scenario-456'],
        userId: 'user-123',
        metrics: ['capacity', 'utilization'],
        timeRange: { start: '08:00', end: '20:00' },
        status: 'completed',
        results: {
          metrics: ['capacity', 'utilization'],
          capacity: {
            'scenario-123': {
              narrowBody: 80,
              wideBody: 40,
              total: 120
            },
            'scenario-456': {
              narrowBody: 90,
              wideBody: 45,
              total: 135
            }
          },
          utilization: {
            'scenario-123': 0.75,
            'scenario-456': 0.82
          }
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: null,
        
        // Methods
        getScenarioDetails: jest.fn().mockResolvedValue([
          { id: 'scenario-123', title: 'Baseline Scenario', description: 'Current airport configuration' },
          { id: 'scenario-456', title: 'Expansion Scenario', description: 'Terminal expansion with 10 new stands' }
        ]),
        startProcessing: jest.fn().mockResolvedValue(true),
        complete: jest.fn().mockResolvedValue(true),
        fail: jest.fn().mockResolvedValue(true)
      });
    }
    return Promise.resolve(null);
  }),
  insert: jest.fn().mockImplementation((data) => Promise.resolve({
    id: data.id || 'comparison-123',
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString()
  }))
};

const mockComparison = {
  id: 'comparison-123',
  scenarioIds: ['scenario-123', 'scenario-456'],
  userId: 'user-123',
  metrics: ['capacity', 'utilization'],
  timeRange: { start: '08:00', end: '20:00' },
  status: 'pending',
  results: null,
  createdAt: new Date().toISOString(),
  completedAt: null,
  errorMessage: null,
  
  // Methods
  getScenarioDetails: jest.fn().mockResolvedValue([
    { id: 'scenario-123', title: 'Baseline Scenario', description: 'Current airport configuration' },
    { id: 'scenario-456', title: 'Expansion Scenario', description: 'Terminal expansion with 10 new stands' }
  ]),
  startProcessing: jest.fn().mockImplementation(() => {
    mockComparison.status = 'processing';
    return Promise.resolve(true);
  }),
  complete: jest.fn().mockImplementation((results) => {
    mockComparison.status = 'completed';
    mockComparison.results = results;
    mockComparison.completedAt = new Date().toISOString();
    return Promise.resolve(mockComparison);
  }),
  fail: jest.fn().mockImplementation((errorMessage) => {
    mockComparison.status = 'failed';
    mockComparison.errorMessage = errorMessage;
    mockComparison.completedAt = new Date().toISOString();
    return Promise.resolve(mockComparison);
  }),
  
  // Query methods
  query: jest.fn().mockReturnValue(comparisonQueryMethods)
};

const ScenarioComparison = jest.fn().mockImplementation(() => mockComparison);
ScenarioComparison.query = jest.fn().mockReturnValue(comparisonQueryMethods);

module.exports = ScenarioComparison;