# AirportAI Agent Phase 3 - Testing Plan

## Overview

This document outlines the testing approach for the AirportAI Agent Phase 3 implementation. We'll use a combination of unit tests, integration tests, and end-to-end tests to validate our implementation.

## Test Types

### 1. Unit Tests

Unit tests will focus on testing individual functions and methods in isolation, mocking all dependencies.

#### Key Components to Test:

- **Services**
  - ProactiveAnalysisService
  - LongTermMemoryService
  - ContinuousLearningService
  - ExternalDataConnectorService
  - CollaborationService
  - WebSocketService

- **Models**
  - All Phase 3 models (UserPreference, DecisionHistory, Pattern, etc.)

### 2. Integration Tests

Integration tests will validate the interaction between multiple components, including database operations.

#### Key Integrations to Test:

- Service to Database interactions
- Controller to Service interactions
- WebSocket real-time notifications
- External data integrations (with mocked external APIs)

### 3. End-to-End Tests

End-to-end tests will validate the full user flow from API to database and back.

#### Key Flows to Test:

- Generating and retrieving proactive insights
- Collaboration workflows
- External data retrieval and caching
- Feedback submission and processing

## Test Implementation Plan

### Unit Tests

```javascript
// Example: ProactiveAnalysisService.test.js
const { ProactiveAnalysisService } = require('../../services/agent');

// Mock dependencies
jest.mock('../../services/standCapacity/StandCapacityToolService', () => ({
  standCapacityService: {
    getCapacityData: jest.fn()
  }
}));
jest.mock('../../services/maintenance/MaintenanceRequestService', () => ({
  maintenanceService: {
    getMaintenanceData: jest.fn()
  }
}));

describe('ProactiveAnalysisService', () => {
  let service;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    service = new ProactiveAnalysisService({
      standCapacityService: require('../../services/standCapacity/StandCapacityToolService').standCapacityService,
      maintenanceService: require('../../services/maintenance/MaintenanceRequestService').maintenanceService
    });
  });
  
  describe('generateInsights', () => {
    it('should generate insights based on capacity and maintenance data', async () => {
      // Arrange
      const options = { airportCode: 'LHR', startDate: '2025-01-01', endDate: '2025-01-07' };
      const mockCapacityData = { /* mock capacity data */ };
      const mockMaintenanceData = { /* mock maintenance data */ };
      
      require('../../services/standCapacity/StandCapacityToolService').standCapacityService.getCapacityData.mockResolvedValue(mockCapacityData);
      require('../../services/maintenance/MaintenanceRequestService').maintenanceService.getMaintenanceData.mockResolvedValue(mockMaintenanceData);
      
      // Act
      const insights = await service.generateInsights(options);
      
      // Assert
      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toHaveProperty('title');
      expect(insights[0]).toHaveProperty('category');
      expect(insights[0]).toHaveProperty('priority');
    });
  });
});
```

### Integration Tests

```javascript
// Example: ProactiveInsightsIntegration.test.js
const request = require('supertest');
const app = require('../../index');
const db = require('../../utils/db');

describe('Proactive Insights API Integration', () => {
  let authToken;
  
  beforeAll(async () => {
    // Setup: Create test user and get auth token
    authToken = 'test-token'; // In a real test, would get actual token
    
    // Initialize database with test data
    await db.migrate.latest();
    await db.seed.run();
  });
  
  afterAll(async () => {
    // Cleanup: Reset database
    await db.destroy();
  });
  
  describe('GET /api/insights', () => {
    it('should return proactive insights for the specified airport', async () => {
      // Act
      const response = await request(app)
        .get('/api/insights?airportCode=LHR')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('insights');
      expect(response.body.insights.length).toBeGreaterThan(0);
    });
  });
});
```

### End-to-End Tests

```javascript
// Example: CollaborationE2E.test.js
const request = require('supertest');
const app = require('../../index');
const db = require('../../utils/db');
const WebSocket = require('ws');

describe('Collaboration End-to-End', () => {
  let authToken;
  let workspaceId;
  let ws;
  
  beforeAll(async () => {
    // Setup: Create test user and get auth token
    authToken = 'test-token'; // In a real test, would get actual token
    
    // Initialize database with test data
    await db.migrate.latest();
    await db.seed.run();
    
    // Create a test workspace
    const response = await request(app)
      .post('/api/collaboration/workspaces')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Workspace', description: 'For E2E testing' });
    
    workspaceId = response.body.workspaceId;
  });
  
  beforeEach(() => {
    // Connect to WebSocket server
    ws = new WebSocket(`ws://localhost:8080/ws?userId=testUser&token=${authToken}`);
  });
  
  afterEach(() => {
    // Close WebSocket connection
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
  
  afterAll(async () => {
    // Cleanup: Reset database
    await db.destroy();
  });
  
  describe('Workspace Collaboration', () => {
    it('should notify users when a comment is added', (done) => {
      // Setup WebSocket handler
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'comment_added') {
          expect(message.workspaceId).toBe(workspaceId);
          expect(message.comment).toHaveProperty('text');
          done();
        }
      });
      
      // Subscribe to workspace
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          workspaceId
        }));
        
        // Add a comment after subscription
        setTimeout(async () => {
          await request(app)
            .post(`/api/collaboration/workspaces/${workspaceId}/comments`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              targetType: 'workspace',
              targetId: workspaceId,
              text: 'This is a test comment'
            });
        }, 500);
      });
    });
  });
});
```

## Test Organization

Tests will be organized in the following directory structure:

```
tests/
├── unit/
│   ├── services/
│   │   ├── agent/
│   │   │   ├── ProactiveAnalysisService.test.js
│   │   │   ├── LongTermMemoryService.test.js
│   │   │   └── ...
│   │   ├── collaboration/
│   │   │   ├── CollaborationService.test.js
│   │   │   └── WebSocketService.test.js
│   │   └── integration/
│   │       └── ExternalDataConnectorService.test.js
│   └── models/
│       ├── agent/
│       │   ├── UserPreference.test.js
│       │   ├── DecisionHistory.test.js
│       │   └── ...
├── integration/
│   ├── controllers/
│   │   ├── ProactiveInsightsController.test.js
│   │   ├── CollaborationController.test.js
│   │   └── ...
│   └── database/
│       └── longTermMemory.test.js
└── e2e/
    ├── proactiveInsights.test.js
    ├── collaboration.test.js
    └── externalData.test.js
```

## Test Coverage Goals

- Unit Tests: 80%+ code coverage for all services and models
- Integration Tests: Cover all public API endpoints
- End-to-End Tests: Cover primary user flows

## Implementation Timeline

1. **Week 1**: Implement unit tests for all services and models
2. **Week 2**: Implement integration tests for controllers and database interactions
3. **Week 3**: Implement end-to-end tests for primary user flows
4. **Week 4**: Improve test coverage, fix issues, and implement performance tests

## Continuous Integration

All tests will be integrated into the CI/CD pipeline to ensure code quality and prevent regressions. The pipeline will:

1. Run unit tests on every commit
2. Run integration tests on pull requests
3. Run end-to-end tests before deployment to staging/production

## Mocking Strategies

- Use Jest mock functions for unit tests
- Use test doubles (spies, stubs) for integration tests
- Use mock servers for external services in end-to-end tests

## Performance Testing

For the WebSocket and collaboration features, we'll implement performance tests to ensure they can handle a reasonable number of concurrent users.

```javascript
// Example: WebSocketPerformance.test.js
const WebSocket = require('ws');

describe('WebSocket Performance', () => {
  it('should handle 100 concurrent connections', async () => {
    const connections = [];
    const messagePromises = [];
    
    // Create 100 connections
    for (let i = 0; i < 100; i++) {
      const ws = new WebSocket(`ws://localhost:8080/ws?userId=user${i}&token=test-token`);
      connections.push(ws);
      
      // Setup message promise
      messagePromises.push(new Promise((resolve) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'welcome') {
            resolve(true);
          }
        });
      }));
    }
    
    // Wait for all connections to receive welcome message
    const results = await Promise.all(messagePromises);
    
    // Cleanup
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    // Assert all connections received welcome message
    expect(results.every(r => r === true)).toBe(true);
  });
});
```

## Next Steps

1. **Set up testing environment**: Configure Jest with proper test environment
2. **Create test database**: Set up a separate database for testing
3. **Implement helper functions**: Create test utilities for common operations
4. **Begin test implementation**: Start with unit tests for services