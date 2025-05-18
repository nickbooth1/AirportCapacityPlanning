/**
 * Integration Tests for Autonomous Operations
 * 
 * These tests verify that the autonomous operations service correctly integrates
 * with other system components and correctly processes policies and decisions.
 */

const request = require('supertest');
const app = require('../../src/index');
const autonomousOperationsService = require('../../src/services/agent/AutonomousOperationsService');
const standCapacityService = require('../../src/services/standCapacityService');
const maintenanceRequestService = require('../../src/services/maintenanceRequestService');
const flightDataService = require('../../src/services/FlightDataService');

// Mock the authentication middleware for testing
jest.mock('../../src/middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', username: 'test-user' };
  next();
});

// Mock the services that the autonomous operations service depends on
jest.mock('../../src/services/standCapacityService');
jest.mock('../../src/services/maintenanceRequestService');
jest.mock('../../src/services/FlightDataService');

describe('Autonomous Operations API Integration Tests', () => {
  // Sample data for testing
  const samplePolicy = {
    policyName: 'test_stand_reallocation',
    description: 'Test policy for stand reallocation',
    decisionType: 'stand_reallocation',
    autonomyLevel: 'semi_autonomous',
    thresholds: {
      maxImpactedFlights: 5,
      maxCapacityReduction: 0.1,
      requiredConfidenceScore: 0.85
    },
    approvalRules: {
      requireApprovalWhen: ['impactsVipAirlines', 'crossesTerminals'],
      autoApproveWhen: ['sameTerminal', 'sameAirline']
    },
    activeHours: {
      start: '08:00',
      end: '22:00'
    },
    enabled: true
  };

  const sampleDecision = {
    decisionType: 'stand_reallocation',
    policyName: 'test_stand_reallocation',
    confidence: 0.95,
    impact: {
      flightsAffected: 3,
      capacityChange: 0.05,
      airlinesAffected: ['TEST']
    },
    proposedAction: {
      summary: 'Reallocate 3 flights to optimize capacity',
      details: {
        flights: ['TEST123', 'TEST456', 'TEST789'],
        fromStands: ['T1-A1', 'T1-A2', 'T1-A3'],
        toStands: ['T1-B1', 'T1-B2', 'T1-B3']
      }
    },
    reasoning: 'Terminal 1 A gates will exceed capacity during peak period',
    timeWindow: {
      start: '2025-06-01T08:00:00Z',
      end: '2025-06-01T12:00:00Z'
    }
  };

  // Setup and teardown
  beforeEach(() => {
    // Reset mocks and service state
    jest.clearAllMocks();
    
    // Mock the stand availability check to return that all stands are available
    standCapacityService.checkStandsAvailability.mockResolvedValue({
      allAvailable: true,
      unavailableStands: []
    });
    
    // Mock the flight data service to return success for reallocation
    flightDataService.updateFlightStandAllocation.mockResolvedValue({ success: true });
    
    // Mock the maintenance service to return success for schedule updates
    maintenanceRequestService.updateMaintenanceSchedule.mockResolvedValue({ success: true });
  });

  // Test policy management
  describe('Policy Management', () => {
    test('POST /api/autonomous/policies should create a new policy', async () => {
      const response = await request(app)
        .post('/api/autonomous/policies')
        .send(samplePolicy)
        .expect(201);
      
      expect(response.body).toHaveProperty('policyId');
      expect(response.body.policyName).toBe(samplePolicy.policyName);
      expect(response.body.status).toBe('active');
    });

    test('GET /api/autonomous/policies should return all policies', async () => {
      // First create a policy
      await request(app)
        .post('/api/autonomous/policies')
        .send(samplePolicy);
      
      // Then retrieve all policies
      const response = await request(app)
        .get('/api/autonomous/policies')
        .expect(200);
      
      expect(response.body).toHaveProperty('policies');
      expect(response.body.policies.length).toBeGreaterThan(0);
      expect(response.body.policies[0].policyName).toBe(samplePolicy.policyName);
    });

    test('PUT /api/autonomous/policies/:policyId should update a policy', async () => {
      // First create a policy
      const createResponse = await request(app)
        .post('/api/autonomous/policies')
        .send(samplePolicy);
      
      const policyId = createResponse.body.policyId;
      
      // Then update the policy
      const response = await request(app)
        .put(`/api/autonomous/policies/${policyId}`)
        .send({ enabled: false })
        .expect(200);
      
      expect(response.body.policyId).toBe(policyId);
      expect(response.body.status).toBe('inactive');
    });
  });

  // Test decision management
  describe('Decision Management', () => {
    beforeEach(async () => {
      // Create a policy for testing decisions
      await request(app)
        .post('/api/autonomous/policies')
        .send(samplePolicy);
    });

    test('POST /api/autonomous/decisions should create a new decision', async () => {
      const response = await request(app)
        .post('/api/autonomous/decisions')
        .send(sampleDecision)
        .expect(201);
      
      expect(response.body).toHaveProperty('decisionId');
      expect(response.body.decisionType).toBe(sampleDecision.decisionType);
    });

    test('GET /api/autonomous/decisions/queue should return the decision queue', async () => {
      // First create a decision
      await request(app)
        .post('/api/autonomous/decisions')
        .send(sampleDecision);
      
      // Then retrieve the queue
      const response = await request(app)
        .get('/api/autonomous/decisions/queue')
        .expect(200);
      
      expect(response.body).toHaveProperty('decisions');
      expect(response.body.decisions.length).toBeGreaterThan(0);
    });

    test('GET /api/autonomous/decisions/:decisionId should return a specific decision', async () => {
      // First create a decision
      const createResponse = await request(app)
        .post('/api/autonomous/decisions')
        .send(sampleDecision);
      
      const decisionId = createResponse.body.decisionId;
      
      // Then retrieve the specific decision
      const response = await request(app)
        .get(`/api/autonomous/decisions/${decisionId}`)
        .expect(200);
      
      expect(response.body.decisionId).toBe(decisionId);
      expect(response.body.decisionType).toBe(sampleDecision.decisionType);
    });

    test('POST /api/autonomous/decisions/:decisionId/approve should approve a decision', async () => {
      // First, modify the mock implementation to make this decision need approval
      const originalCheckCondition = autonomousOperationsService.checkCondition;
      autonomousOperationsService.checkCondition = jest.fn().mockImplementation((decision, condition) => {
        if (condition === 'impactsVipAirlines') return true;
        return false;
      });
      
      // Create a decision
      const createResponse = await request(app)
        .post('/api/autonomous/decisions')
        .send(sampleDecision);
      
      const decisionId = createResponse.body.decisionId;
      
      // Then approve the decision
      const response = await request(app)
        .post(`/api/autonomous/decisions/${decisionId}/approve`)
        .send({ approverNotes: 'Approved for testing' })
        .expect(200);
      
      expect(response.body.decisionId).toBe(decisionId);
      expect(response.body.status).toBe('approved');
      expect(response.body).toHaveProperty('approvedAt');
      expect(response.body).toHaveProperty('approvedBy', 'test-user');
      
      // Restore the original method
      autonomousOperationsService.checkCondition = originalCheckCondition;
    });

    test('POST /api/autonomous/decisions/:decisionId/reject should reject a decision', async () => {
      // First, modify the mock implementation to make this decision need approval
      const originalCheckCondition = autonomousOperationsService.checkCondition;
      autonomousOperationsService.checkCondition = jest.fn().mockImplementation((decision, condition) => {
        if (condition === 'impactsVipAirlines') return true;
        return false;
      });
      
      // Create a decision
      const createResponse = await request(app)
        .post('/api/autonomous/decisions')
        .send(sampleDecision);
      
      const decisionId = createResponse.body.decisionId;
      
      // Then reject the decision
      const response = await request(app)
        .post(`/api/autonomous/decisions/${decisionId}/reject`)
        .send({ rejectionReason: 'Rejected for testing' })
        .expect(200);
      
      expect(response.body.decisionId).toBe(decisionId);
      expect(response.body.status).toBe('rejected');
      expect(response.body).toHaveProperty('rejectedAt');
      expect(response.body).toHaveProperty('rejectedBy', 'test-user');
      expect(response.body.rejectionReason).toBe('Rejected for testing');
      
      // Restore the original method
      autonomousOperationsService.checkCondition = originalCheckCondition;
    });
  });

  // Test metrics
  describe('Operational Metrics', () => {
    test('GET /api/autonomous/metrics should return operational metrics', async () => {
      // First create a policy and some decisions
      await request(app)
        .post('/api/autonomous/policies')
        .send(samplePolicy);
      
      await request(app)
        .post('/api/autonomous/decisions')
        .send(sampleDecision);
      
      // Then retrieve the metrics
      const response = await request(app)
        .get('/api/autonomous/metrics')
        .expect(200);
      
      expect(response.body).toHaveProperty('totalDecisions');
      expect(response.body).toHaveProperty('successRate');
      expect(response.body).toHaveProperty('decisionTypeBreakdown');
      expect(response.body).toHaveProperty('statusBreakdown');
      expect(response.body).toHaveProperty('timeDistribution');
    });
  });

  // Test integration with other services
  describe('Service Integration', () => {
    beforeEach(async () => {
      // Create a policy for testing decisions
      await request(app)
        .post('/api/autonomous/policies')
        .send(samplePolicy);
    });

    test('Stand reallocation decision should call standCapacityService and flightDataService', async () => {
      // Create a decision
      await request(app)
        .post('/api/autonomous/decisions')
        .send(sampleDecision);
      
      // Check that the services were called
      expect(standCapacityService.checkStandsAvailability).toHaveBeenCalled();
      expect(flightDataService.updateFlightStandAllocation).toHaveBeenCalled();
    });

    test('Maintenance schedule adjustment should call maintenanceRequestService', async () => {
      // Create a maintenance schedule adjustment decision
      const maintenanceDecision = {
        decisionType: 'maintenance_schedule_adjustment',
        policyName: 'test_stand_reallocation', // Reuse the same policy for simplicity
        confidence: 0.95,
        impact: {
          flightsAffected: 2,
          capacityChange: 0.03
        },
        proposedAction: {
          summary: 'Adjust maintenance schedule to optimize capacity',
          details: {
            maintenanceId: 'maint-123',
            originalStartTime: '2025-06-01T08:00:00Z',
            originalEndTime: '2025-06-01T12:00:00Z',
            newStartTime: '2025-06-01T14:00:00Z',
            newEndTime: '2025-06-01T18:00:00Z'
          }
        },
        reasoning: 'Moving maintenance to off-peak hours will improve capacity',
        timeWindow: {
          start: '2025-06-01T00:00:00Z',
          end: '2025-06-01T23:59:59Z'
        }
      };
      
      await request(app)
        .post('/api/autonomous/decisions')
        .send(maintenanceDecision);
      
      // Check that the maintenance service was called
      expect(maintenanceRequestService.updateMaintenanceSchedule).toHaveBeenCalled();
    });
  });
});