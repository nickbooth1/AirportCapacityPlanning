/**
 * Manual mock for ScenarioVersion model
 */

const versionQueryMethods = {
  findById: jest.fn().mockImplementation((id) => {
    if (id) {
      return Promise.resolve({
        id: id,
        scenarioId: 'scenario-123',
        parameters: { terminal: 'A', standType: 'narrow-body', count: 5 },
        changeDescription: 'Initial version',
        createdBy: 'user-123',
        createdAt: new Date().toISOString()
      });
    }
    return Promise.resolve(null);
  }),
  insert: jest.fn().mockImplementation((data) => Promise.resolve({
    id: data.id || 'version-123',
    ...data,
    createdAt: new Date().toISOString()
  })),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  then: jest.fn(cb => cb([
    {
      id: 'version-123',
      scenarioId: 'scenario-123',
      parameters: { terminal: 'A', standType: 'narrow-body', count: 5 },
      changeDescription: 'Initial version',
      createdBy: 'user-123',
      createdAt: new Date().toISOString()
    },
    {
      id: 'version-456',
      scenarioId: 'scenario-123',
      parameters: { terminal: 'B', standType: 'wide-body', count: 3 },
      changeDescription: 'Updated parameters',
      createdBy: 'user-123',
      createdAt: new Date(Date.now() + 3600000).toISOString()
    }
  ]))
};

const mockVersion = {
  id: 'version-123',
  scenarioId: 'scenario-123',
  parameters: { terminal: 'A', standType: 'narrow-body', count: 5 },
  changeDescription: 'Initial version',
  createdBy: 'user-123',
  createdAt: new Date().toISOString(),
  
  // Query methods
  query: jest.fn().mockReturnValue(versionQueryMethods)
};

const ScenarioVersion = jest.fn().mockImplementation(() => mockVersion);
ScenarioVersion.query = jest.fn().mockReturnValue(versionQueryMethods);

module.exports = ScenarioVersion;