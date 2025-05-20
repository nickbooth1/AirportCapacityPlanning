/**
 * Manual mock for Scenario model
 */

const mockCreateVersion = jest.fn().mockResolvedValue({ id: 'version-123' });
const mockStartCalculation = jest.fn().mockResolvedValue({ id: 'calculation-123', status: 'pending' });

const scenarioQueryMethods = {
  findById: jest.fn().mockReturnThis(),
  insert: jest.fn().mockImplementation((data) => Promise.resolve({
    id: data.id || 'scenario-123',
    ...data
  })),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  withGraphFetched: jest.fn().mockReturnThis(),
  modifiers: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(),
  first: jest.fn().mockResolvedValue({ total: 10 }),
  patch: jest.fn().mockResolvedValue({ id: 'scenario-123', status: 'updated' }),
  then: jest.fn(cb => cb([
    {
      id: 'scenario-123',
      title: 'Test Scenario',
      description: 'Test scenario description',
      status: 'created',
      type: 'what-if',
      parameters: { terminal: 'A', standType: 'narrow-body', count: 5 },
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      userId: 'user-123',
      baselineId: null,
      calculations: [
        { 
          id: 'calculation-123', 
          status: 'completed',
          results: { capacity: { totalCapacity: 120 } },
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        }
      ]
    }
  ]))
};

const mockScenario = {
  id: 'scenario-123',
  title: 'Test Scenario',
  description: 'Test scenario description',
  status: 'created',
  type: 'what-if',
  parameters: { terminal: 'A', standType: 'narrow-body', count: 5 },
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
  userId: 'user-123',
  baselineId: null,
  calculations: [],
  
  // Methods
  createVersion: mockCreateVersion,
  startCalculation: mockStartCalculation,
  
  // Query methods
  query: jest.fn().mockReturnValue(scenarioQueryMethods),
  $query: jest.fn().mockReturnValue({
    patch: jest.fn().mockResolvedValue({
      id: 'scenario-123',
      title: 'Updated Scenario',
      description: 'Updated description',
      status: 'updated',
      parameters: { terminal: 'B', standType: 'wide-body', count: 3 }
    })
  })
};

const Scenario = jest.fn().mockImplementation(() => mockScenario);
Scenario.query = jest.fn().mockReturnValue(scenarioQueryMethods);

module.exports = Scenario;