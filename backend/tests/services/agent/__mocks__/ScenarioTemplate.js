/**
 * Manual mock for ScenarioTemplate model
 */

const templateQueryMethods = {
  findById: jest.fn().mockImplementation((id) => {
    if (id) {
      return Promise.resolve({
        id: id,
        name: 'Capacity Expansion',
        description: 'Template for airport capacity expansion scenarios',
        category: 'expansion',
        defaultParameters: { terminal: 'A', standType: 'narrow-body', count: 5 },
        requiredParameters: ['terminal', 'standType', 'count'],
        parameterSchema: {
          type: 'object',
          properties: {
            terminal: { type: 'string', enum: ['A', 'B', 'C'] },
            standType: { type: 'string', enum: ['narrow-body', 'wide-body'] },
            count: { type: 'number', minimum: 1, maximum: 20 }
          },
          required: ['terminal', 'standType', 'count']
        },
        visualizationOptions: ['capacityBarChart', 'utilizationTimeline'],
        isSystem: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        
        // Methods
        validateParameters: jest.fn().mockImplementation((params) => {
          // Simple validation example
          const missingParams = [];
          const requiredParams = ['terminal', 'standType', 'count'];
          
          for (const param of requiredParams) {
            if (params[param] === undefined) {
              missingParams.push(param);
            }
          }
          
          if (missingParams.length > 0) {
            return {
              isValid: false,
              errors: missingParams.map(param => `Missing required parameter: ${param}`)
            };
          }
          
          return { isValid: true, errors: [] };
        }),
        
        createScenario: jest.fn().mockImplementation((userId, title, description, parameters) => {
          return Promise.resolve({
            id: 'scenario-123',
            userId,
            title,
            description,
            parameters: { ...parameters },
            type: 'what-if',
            status: 'created',
            metadata: {
              templateId: id,
              templateName: 'Capacity Expansion'
            },
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
          });
        })
      });
    }
    return Promise.resolve(null);
  }),
  insert: jest.fn().mockImplementation((data) => Promise.resolve({
    id: data.id || 'template-123',
    ...data,
    createdAt: new Date().toISOString()
  })),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  then: jest.fn(cb => cb([
    {
      id: 'template-123',
      name: 'Capacity Expansion',
      description: 'Template for airport capacity expansion scenarios',
      category: 'expansion',
      requiredParameters: ['terminal', 'standType', 'count'],
      isSystem: true
    },
    {
      id: 'template-456',
      name: 'Future Forecast',
      description: 'Template for long-term capacity forecasting',
      category: 'forecast',
      requiredParameters: ['forecastYears', 'annualGrowthRate'],
      isSystem: true
    }
  ]))
};

const mockTemplate = {
  id: 'template-123',
  name: 'Capacity Expansion',
  description: 'Template for airport capacity expansion scenarios',
  category: 'expansion',
  defaultParameters: { terminal: 'A', standType: 'narrow-body', count: 5 },
  requiredParameters: ['terminal', 'standType', 'count'],
  parameterSchema: {
    type: 'object',
    properties: {
      terminal: { type: 'string', enum: ['A', 'B', 'C'] },
      standType: { type: 'string', enum: ['narrow-body', 'wide-body'] },
      count: { type: 'number', minimum: 1, maximum: 20 }
    },
    required: ['terminal', 'standType', 'count']
  },
  visualizationOptions: ['capacityBarChart', 'utilizationTimeline'],
  isSystem: true,
  createdBy: 'system',
  createdAt: new Date().toISOString(),
  
  // Methods
  validateParameters: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  createScenario: jest.fn().mockResolvedValue({
    id: 'scenario-123',
    title: 'Test Scenario',
    description: 'Created from template',
    parameters: { terminal: 'A', standType: 'narrow-body', count: 5 },
    type: 'what-if',
    status: 'created'
  }),
  
  // Query methods
  query: jest.fn().mockReturnValue(templateQueryMethods)
};

const ScenarioTemplate = jest.fn().mockImplementation(() => mockTemplate);
ScenarioTemplate.query = jest.fn().mockReturnValue(templateQueryMethods);

module.exports = ScenarioTemplate;