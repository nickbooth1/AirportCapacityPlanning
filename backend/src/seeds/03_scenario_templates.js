/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('scenario_templates').del();
  
  // System user ID for system-created templates
  const systemUserId = 'system';
  
  // Insert scenario templates
  await knex('scenario_templates').insert([
    {
      id: '1e9a8e7d-6c5b-4a3f-9e2d-1b0a9c8d7e6f',
      name: 'Add Terminal Stands',
      description: 'Add a specified number of stands to a terminal',
      category: 'infrastructure',
      defaultParameters: {
        terminal: null,
        standType: 'narrow_body',
        count: 1
      },
      parameterSchema: {
        type: 'object',
        required: ['terminal', 'standType', 'count'],
        properties: {
          terminal: { type: 'string' },
          standType: { type: 'string', enum: ['narrow_body', 'wide_body'] },
          count: { type: 'number', minimum: 1, maximum: 50 }
        }
      },
      requiredParameters: ['terminal', 'standType', 'count'],
      visualizationOptions: ['barChart', 'lineChart'],
      isSystem: true,
      createdBy: systemUserId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    },
    {
      id: '2d8b9f6e-5a4c-3b2e-8d1c-9a0b8c7d6e5f',
      name: 'Modify Turnaround Times',
      description: 'Change turnaround times for specific aircraft types',
      category: 'operations',
      defaultParameters: {
        aircraftType: null,
        currentTurnaroundTime: null,
        newTurnaroundTime: null
      },
      parameterSchema: {
        type: 'object',
        required: ['aircraftType', 'newTurnaroundTime'],
        properties: {
          aircraftType: { type: 'string' },
          currentTurnaroundTime: { type: 'number' },
          newTurnaroundTime: { type: 'number', minimum: 15, maximum: 240 }
        }
      },
      requiredParameters: ['aircraftType', 'newTurnaroundTime'],
      visualizationOptions: ['barChart', 'lineChart', 'timelineChart'],
      isSystem: true,
      createdBy: systemUserId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    },
    {
      id: '3c7a8e9d-4b5c-2a1f-7e0d-8b9a7c6d5e4f',
      name: 'Annual Growth Forecast',
      description: 'Forecast capacity based on annual growth percentage',
      category: 'forecast',
      defaultParameters: {
        annualGrowthRate: 0.03,
        forecastYears: [1, 5, 10],
        addStands: true
      },
      parameterSchema: {
        type: 'object',
        required: ['annualGrowthRate', 'forecastYears'],
        properties: {
          annualGrowthRate: { type: 'number', minimum: 0, maximum: 0.2 },
          forecastYears: { 
            type: 'array', 
            items: { type: 'number' },
            minItems: 1
          },
          addStands: { type: 'boolean' }
        }
      },
      requiredParameters: ['annualGrowthRate', 'forecastYears'],
      visualizationOptions: ['barChart', 'lineChart', 'areaChart'],
      isSystem: true,
      createdBy: systemUserId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    },
    {
      id: '4f6b7e8d-9c0a-1b2d-3e4f-5a6b7c8d9e0f',
      name: 'Terminal Capacity Optimization',
      description: 'Identify and optimize terminal capacity bottlenecks',
      category: 'optimization',
      defaultParameters: {
        terminal: null,
        targetUtilization: 0.85,
        peakHour: true,
        optimizeBuffers: true
      },
      parameterSchema: {
        type: 'object',
        required: ['terminal', 'targetUtilization'],
        properties: {
          terminal: { type: 'string' },
          targetUtilization: { type: 'number', minimum: 0.5, maximum: 0.95 },
          peakHour: { type: 'boolean' },
          optimizeBuffers: { type: 'boolean' }
        }
      },
      requiredParameters: ['terminal', 'targetUtilization'],
      visualizationOptions: ['barChart', 'heatmap', 'tableView'],
      isSystem: true,
      createdBy: systemUserId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    },
    {
      id: '5e4d3c2b-1a0f-9e8d-7c6b-5a4b3c2d1e0f',
      name: 'Stand Adjacency Impact',
      description: 'Analyze the impact of stand adjacency rules on capacity',
      category: 'adjacency',
      defaultParameters: {
        standType: 'wide_body',
        adjacencyRule: 'adjacent_unavailable',
        terminal: null
      },
      parameterSchema: {
        type: 'object',
        required: ['standType', 'adjacencyRule'],
        properties: {
          standType: { type: 'string', enum: ['narrow_body', 'wide_body'] },
          adjacencyRule: { 
            type: 'string', 
            enum: ['adjacent_unavailable', 'adjacent_same_type', 'no_restriction'] 
          },
          terminal: { type: 'string' }
        }
      },
      requiredParameters: ['standType', 'adjacencyRule'],
      visualizationOptions: ['heatmap', 'adjacencyMatrix', 'barChart'],
      isSystem: true,
      createdBy: systemUserId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    }
  ]);
};