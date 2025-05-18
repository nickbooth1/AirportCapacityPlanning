/**
 * Integration tests for Capacity Impact Analysis
 */
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const app = require('../../src/app'); // Adjust as needed for your app structure
const aggregatedCapacityImpactService = require('../../src/services/AggregatedCapacityImpactService');

describe('Capacity Impact Analysis API', () => {
  // Create a stub for the service method
  let getImpactStub;
  
  beforeEach(() => {
    // Mock the service response
    const mockServiceResponse = [
      {
        date: '2023-12-15',
        originalDailyCapacity: {
          narrowBody: 150,
          wideBody: 50,
          total: 200
        },
        capacityAfterDefiniteImpact: {
          narrowBody: 140,
          wideBody: 48,
          total: 188
        },
        finalNetCapacity: {
          narrowBody: 135,
          wideBody: 48,
          total: 183
        },
        maintenanceImpacts: {
          definite: {
            reduction: {
              narrowBody: 10,
              wideBody: 2,
              total: 12
            },
            requests: [
              {
                id: 1,
                title: 'Test Maintenance 1',
                standCode: 'S101',
                statusName: 'Approved',
                startTime: '2023-12-15T08:00:00Z',
                endTime: '2023-12-15T14:00:00Z'
              }
            ]
          },
          potential: {
            reduction: {
              narrowBody: 5,
              wideBody: 0,
              total: 5
            },
            requests: [
              {
                id: 2,
                title: 'Test Maintenance 2',
                standCode: 'S102',
                statusName: 'Requested',
                startTime: '2023-12-15T16:00:00Z',
                endTime: '2023-12-16T10:00:00Z'
              }
            ]
          }
        }
      },
      {
        date: '2023-12-16',
        originalDailyCapacity: {
          narrowBody: 150,
          wideBody: 50,
          total: 200
        },
        capacityAfterDefiniteImpact: {
          narrowBody: 150,
          wideBody: 50,
          total: 200
        },
        finalNetCapacity: {
          narrowBody: 145,
          wideBody: 50,
          total: 195
        },
        maintenanceImpacts: {
          definite: {
            reduction: {
              narrowBody: 0,
              wideBody: 0,
              total: 0
            },
            requests: []
          },
          potential: {
            reduction: {
              narrowBody: 5,
              wideBody: 0,
              total: 5
            },
            requests: [
              {
                id: 2,
                title: 'Test Maintenance 2',
                standCode: 'S102',
                statusName: 'Requested',
                startTime: '2023-12-15T16:00:00Z',
                endTime: '2023-12-16T10:00:00Z'
              }
            ]
          }
        }
      }
    ];
    
    // Create the stub
    getImpactStub = sinon.stub(aggregatedCapacityImpactService, 'getDailyImpactedCapacity')
      .resolves(mockServiceResponse);
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('GET /api/capacity/impact-analysis', () => {
    it('should return 400 if startDate is missing', async () => {
      const response = await request(app)
        .get('/api/capacity/impact-analysis')
        .query({ endDate: '2023-12-16' });
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('message');
      expect(response.body.message).to.include('startDate and endDate');
    });
    
    it('should return 400 if endDate is missing', async () => {
      const response = await request(app)
        .get('/api/capacity/impact-analysis')
        .query({ startDate: '2023-12-15' });
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('message');
      expect(response.body.message).to.include('startDate and endDate');
    });
    
    it('should return 400 if dates are in invalid format', async () => {
      const response = await request(app)
        .get('/api/capacity/impact-analysis')
        .query({ startDate: '15-12-2023', endDate: '2023-12-16' });
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('message');
      expect(response.body.message).to.include('format');
    });
    
    it('should return 400 if startDate is after endDate', async () => {
      const response = await request(app)
        .get('/api/capacity/impact-analysis')
        .query({ startDate: '2023-12-17', endDate: '2023-12-16' });
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('message');
      expect(response.body.message).to.include('startDate must be before');
    });
    
    it('should return 200 with daily impact data for valid request', async () => {
      const response = await request(app)
        .get('/api/capacity/impact-analysis')
        .query({ startDate: '2023-12-15', endDate: '2023-12-16' });
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('analysisDate');
      expect(response.body).to.have.property('dateRange');
      expect(response.body.dateRange).to.deep.equal({
        startDate: '2023-12-15',
        endDate: '2023-12-16'
      });
      
      expect(response.body).to.have.property('dailyImpacts');
      expect(response.body.dailyImpacts).to.be.an('array');
      expect(response.body.dailyImpacts.length).to.equal(2);
      
      // Verify first day of results
      const day1 = response.body.dailyImpacts[0];
      expect(day1.date).to.equal('2023-12-15');
      expect(day1.originalDailyCapacity.total).to.equal(200);
      expect(day1.capacityAfterDefiniteImpact.total).to.equal(188);
      expect(day1.finalNetCapacity.total).to.equal(183);
      
      // Verify maintenance impacts for first day
      expect(day1.maintenanceImpacts.definite.reduction.total).to.equal(12);
      expect(day1.maintenanceImpacts.potential.reduction.total).to.equal(5);
      expect(day1.maintenanceImpacts.definite.requests).to.be.an('array');
      expect(day1.maintenanceImpacts.definite.requests.length).to.equal(1);
      expect(day1.maintenanceImpacts.potential.requests.length).to.equal(1);
      
      // Verify stub was called with right parameters
      expect(getImpactStub.calledOnce).to.be.true;
      expect(getImpactStub.firstCall.args[0]).to.deep.equal({
        startDate: '2023-12-15',
        endDate: '2023-12-16'
      });
    });
  });
}); 