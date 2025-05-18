/**
 * Unit tests for AggregatedCapacityImpactService
 */
const { expect } = require('chai');
const sinon = require('sinon');
const { format } = require('date-fns');

// Import the service to test
const aggregatedCapacityImpactService = require('../../src/services/AggregatedCapacityImpactService');

// Import dependencies to mock
const standCapacityToolService = require('../../src/services/standCapacityToolService');
const maintenanceRequestService = require('../../src/services/maintenanceRequestService');
const Stand = require('../../src/models/Stand');
const AircraftType = require('../../src/models/AircraftType');
const OperationalSettings = require('../../src/models/OperationalSettings');
const MaintenanceStatusType = require('../../src/models/MaintenanceStatusType');
const { db } = require('../../src/utils/db');

describe('AggregatedCapacityImpactService', () => {
  // Setup test data
  const mockStands = [
    { id: 1, code: 'S101', max_aircraft_size_code: 'C' },
    { id: 2, code: 'S102', max_aircraft_size_code: 'E' }
  ];
  
  const mockAircraftTypes = [
    { id: 1, icao_code: 'A320', size_category_code: 'C' },
    { id: 2, icao_code: 'B738', size_category_code: 'C' },
    { id: 3, icao_code: 'B777', size_category_code: 'E' }
  ];
  
  const mockTurnaroundRules = [
    { aircraft_type_id: 1, min_turnaround_minutes: 45 },
    { aircraft_type_id: 2, min_turnaround_minutes: 40 },
    { aircraft_type_id: 3, min_turnaround_minutes: 90 }
  ];
  
  const mockStandConstraints = [
    { stand_id: 1, aircraft_type_id: 1, is_allowed: true },
    { stand_id: 1, aircraft_type_id: 2, is_allowed: true },
    { stand_id: 2, aircraft_type_id: 1, is_allowed: true },
    { stand_id: 2, aircraft_type_id: 2, is_allowed: true },
    { stand_id: 2, aircraft_type_id: 3, is_allowed: true }
  ];
  
  const mockOperationalSettings = {
    default_gap_minutes: 15,
    slot_duration_minutes: 60
  };
  
  const mockStatusTypes = [
    { id: 1, name: 'Requested' },
    { id: 2, name: 'Approved' },
    { id: 3, name: 'Rejected' },
    { id: 4, name: 'In Progress' },
    { id: 5, name: 'Completed' },
    { id: 6, name: 'Cancelled' }
  ];
  
  const mockTimeSlots = [
    { name: 'Morning', start_time: '06:00:00', end_time: '12:00:00' },
    { name: 'Afternoon', start_time: '12:00:00', end_time: '18:00:00' },
    { name: 'Evening', start_time: '18:00:00', end_time: '23:00:00' }
  ];
  
  const mockCapacityResult = {
    bestCaseCapacity: {
      'Morning': {
        'A320': 10,
        'B738': 8,
        'B777': 5
      },
      'Afternoon': {
        'A320': 12,
        'B738': 10,
        'B777': 6
      },
      'Evening': {
        'A320': 8,
        'B738': 6,
        'B777': 4
      }
    },
    timeSlots: mockTimeSlots
  };
  
  const mockMaintenanceRequests = [
    {
      id: 1,
      title: 'Test Maintenance 1',
      stand_id: 1,
      stand: { name: 'S101' },
      status_id: 2,
      status: { name: 'Approved' },
      start_datetime: '2023-12-15T08:00:00Z',
      end_datetime: '2023-12-15T14:00:00Z'
    },
    {
      id: 2,
      title: 'Test Maintenance 2',
      stand_id: 2,
      stand: { name: 'S102' },
      status_id: 1,
      status: { name: 'Requested' },
      start_datetime: '2023-12-15T16:00:00Z',
      end_datetime: '2023-12-16T10:00:00Z'
    }
  ];
  
  // Setup stubs
  let standQueryStub;
  let aircraftTypeQueryStub;
  let operationalSettingsQueryStub;
  let maintenanceStatusTypeQueryStub;
  let dbStub;
  let standCapacityToolServiceStub;
  let maintenanceRequestServiceStub;
  
  beforeEach(() => {
    // Reset service state
    aggregatedCapacityImpactService.isInitialized = false;
    aggregatedCapacityImpactService.standsData = null;
    aggregatedCapacityImpactService.aircraftTypesData = null;
    aggregatedCapacityImpactService.operationalSettings = null;
    aggregatedCapacityImpactService.maintenanceStatusTypes = null;
    
    // Create stubs
    standQueryStub = sinon.stub(Stand, 'query').returns({
      where: sinon.stub().returnsThis(),
      select: sinon.stub().resolves(mockStands)
    });
    
    aircraftTypeQueryStub = sinon.stub(AircraftType, 'query').returns({
      where: sinon.stub().returnsThis(),
      select: sinon.stub().resolves(mockAircraftTypes)
    });
    
    operationalSettingsQueryStub = sinon.stub(OperationalSettings, 'query').returns({
      first: sinon.stub().resolves(mockOperationalSettings)
    });
    
    maintenanceStatusTypeQueryStub = sinon.stub(MaintenanceStatusType, 'query').returns({
      resolves: mockStatusTypes
    });
    
    dbStub = sinon.stub(db, 'select').callsFake((fields) => {
      return {
        where: function(condition) {
          if (condition === 'is_active') {
            return {
              resolves: mockTurnaroundRules
            };
          } else if (condition === 'is_allowed') {
            return {
              resolves: mockStandConstraints
            };
          }
          return this;
        }
      };
    });
    
    standCapacityToolServiceStub = sinon.stub(standCapacityToolService, 'calculateCapacity')
      .resolves(mockCapacityResult);
    
    maintenanceRequestServiceStub = sinon.stub(maintenanceRequestService, 'getAllRequests')
      .resolves(mockMaintenanceRequests);
    
    // Stub db function for different tables
    sinon.stub(db, 'turnaround_rules').returns({
      select: sinon.stub().returnsThis(),
      where: sinon.stub().resolves(mockTurnaroundRules)
    });
    
    sinon.stub(db, 'stand_aircraft_constraints').returns({
      select: sinon.stub().returnsThis(),
      where: sinon.stub().resolves(mockStandConstraints)
    });
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('_getBodyType', () => {
    it('should return "wideBody" for size categories E and F', () => {
      expect(aggregatedCapacityImpactService._getBodyType('E')).to.equal('wideBody');
      expect(aggregatedCapacityImpactService._getBodyType('F')).to.equal('wideBody');
    });
    
    it('should return "narrowBody" for size categories A through D', () => {
      expect(aggregatedCapacityImpactService._getBodyType('A')).to.equal('narrowBody');
      expect(aggregatedCapacityImpactService._getBodyType('B')).to.equal('narrowBody');
      expect(aggregatedCapacityImpactService._getBodyType('C')).to.equal('narrowBody');
      expect(aggregatedCapacityImpactService._getBodyType('D')).to.equal('narrowBody');
    });
    
    it('should handle lowercase letters', () => {
      expect(aggregatedCapacityImpactService._getBodyType('e')).to.equal('wideBody');
      expect(aggregatedCapacityImpactService._getBodyType('c')).to.equal('narrowBody');
    });
    
    it('should handle whitespace', () => {
      expect(aggregatedCapacityImpactService._getBodyType(' E ')).to.equal('wideBody');
      expect(aggregatedCapacityImpactService._getBodyType(' C ')).to.equal('narrowBody');
    });
    
    it('should default to "narrowBody" if no size category is provided', () => {
      expect(aggregatedCapacityImpactService._getBodyType()).to.equal('narrowBody');
      expect(aggregatedCapacityImpactService._getBodyType(null)).to.equal('narrowBody');
      expect(aggregatedCapacityImpactService._getBodyType('')).to.equal('narrowBody');
    });
  });
  
  describe('_getCompatibleTypesFromSizeCode', () => {
    it('should return all aircraft types with size code <= maxSizeCode', () => {
      const result = aggregatedCapacityImpactService._getCompatibleTypesFromSizeCode('E', mockAircraftTypes);
      expect(result).to.include('A320');
      expect(result).to.include('B738');
      expect(result).to.include('B777');
    });
    
    it('should exclude aircraft types with size code > maxSizeCode', () => {
      const result = aggregatedCapacityImpactService._getCompatibleTypesFromSizeCode('C', mockAircraftTypes);
      expect(result).to.include('A320');
      expect(result).to.include('B738');
      expect(result).to.not.include('B777'); // E > C
    });
    
    it('should handle lowercase letters and whitespace', () => {
      const result = aggregatedCapacityImpactService._getCompatibleTypesFromSizeCode(' c ', mockAircraftTypes);
      expect(result).to.include('A320');
      expect(result).to.include('B738');
      expect(result).to.not.include('B777');
    });
    
    it('should return empty array for invalid size codes', () => {
      expect(aggregatedCapacityImpactService._getCompatibleTypesFromSizeCode('Z', mockAircraftTypes)).to.be.empty;
      expect(aggregatedCapacityImpactService._getCompatibleTypesFromSizeCode('', mockAircraftTypes)).to.be.empty;
      expect(aggregatedCapacityImpactService._getCompatibleTypesFromSizeCode(null, mockAircraftTypes)).to.be.empty;
    });
  });
  
  describe('_calculateDailyTotals', () => {
    it('should correctly calculate daily totals from slot capacities', () => {
      // We need to setup the aircraft types data first
      aggregatedCapacityImpactService.aircraftTypesData = new Map();
      aggregatedCapacityImpactService.aircraftTypesData.set('A320', { bodyType: 'narrowBody' });
      aggregatedCapacityImpactService.aircraftTypesData.set('B738', { bodyType: 'narrowBody' });
      aggregatedCapacityImpactService.aircraftTypesData.set('B777', { bodyType: 'wideBody' });
      
      const result = aggregatedCapacityImpactService._calculateDailyTotals(mockCapacityResult.bestCaseCapacity);
      
      expect(result.narrowBody).to.equal(54); // 10+8+12+10+8+6
      expect(result.wideBody).to.equal(15);   // 5+6+4
      expect(result.total).to.equal(69);      // 54+15
    });
    
    it('should handle empty slot data', () => {
      aggregatedCapacityImpactService.aircraftTypesData = new Map();
      
      const result = aggregatedCapacityImpactService._calculateDailyTotals({});
      
      expect(result.narrowBody).to.equal(0);
      expect(result.wideBody).to.equal(0);
      expect(result.total).to.equal(0);
    });
    
    it('should handle missing aircraft type data', () => {
      aggregatedCapacityImpactService.aircraftTypesData = new Map();
      aggregatedCapacityImpactService.aircraftTypesData.set('A320', { bodyType: 'narrowBody' });
      // B738 and B777 intentionally missing
      
      const result = aggregatedCapacityImpactService._calculateDailyTotals(mockCapacityResult.bestCaseCapacity);
      
      expect(result.narrowBody).to.equal(30); // 10+12+8 (only A320)
      expect(result.wideBody).to.equal(0);    // No wide body types recognized
      expect(result.total).to.equal(30);      // 30+0
    });
  });
  
  describe('_deepCopy', () => {
    it('should create a deep copy of an object', () => {
      const original = { a: 1, b: { c: 2 } };
      const copy = aggregatedCapacityImpactService._deepCopy(original);
      
      expect(copy).to.deep.equal(original);
      
      // Modify the copy, should not affect original
      copy.b.c = 3;
      expect(original.b.c).to.equal(2);
    });
  });
  
  describe('getDailyImpactedCapacity', () => {
    it('should throw an error if startDate or endDate is missing', async () => {
      try {
        await aggregatedCapacityImpactService.getDailyImpactedCapacity({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('startDate and endDate are required');
      }
      
      try {
        await aggregatedCapacityImpactService.getDailyImpactedCapacity({ startDate: '2023-12-15' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('startDate and endDate are required');
      }
      
      try {
        await aggregatedCapacityImpactService.getDailyImpactedCapacity({ endDate: '2023-12-15' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('startDate and endDate are required');
      }
    });
    
    it('should fetch capacity data and maintenance requests', async () => {
      // Create better stubs for this test
      standQueryStub.restore();
      aircraftTypeQueryStub.restore();
      maintenanceStatusTypeQueryStub.restore();
      dbStub.restore();
      
      // Mock _initialize to avoid db calls
      sinon.stub(aggregatedCapacityImpactService, '_initialize').resolves();
      
      // Setup test data in the service
      aggregatedCapacityImpactService.standsData = new Map();
      aggregatedCapacityImpactService.standsData.set('S101', { dbId: 1, compatibleAircraftICAOs: ['A320', 'B738'] });
      aggregatedCapacityImpactService.standsData.set('S102', { dbId: 2, compatibleAircraftICAOs: ['A320', 'B738', 'B777'] });
      
      aggregatedCapacityImpactService.aircraftTypesData = new Map();
      aggregatedCapacityImpactService.aircraftTypesData.set('A320', { sizeCategory: 'C', averageTurnaroundMinutes: 45, bodyType: 'narrowBody' });
      aggregatedCapacityImpactService.aircraftTypesData.set('B738', { sizeCategory: 'C', averageTurnaroundMinutes: 40, bodyType: 'narrowBody' });
      aggregatedCapacityImpactService.aircraftTypesData.set('B777', { sizeCategory: 'E', averageTurnaroundMinutes: 90, bodyType: 'wideBody' });
      
      aggregatedCapacityImpactService.MAINTENANCE_IMPACT_CATEGORIES = {
        DEFINITE: [2, 4, 5],
        POTENTIAL: [1]
      };
      
      // Call the method
      const result = await aggregatedCapacityImpactService.getDailyImpactedCapacity({
        startDate: '2023-12-15',
        endDate: '2023-12-16'
      });
      
      // Verify the result
      expect(result).to.be.an('array');
      expect(result.length).to.equal(2); // Two days
      
      // Verify the first day
      const day1 = result[0];
      expect(day1.date).to.equal('2023-12-15');
      expect(day1).to.have.property('originalDailyCapacity');
      expect(day1).to.have.property('capacityAfterDefiniteImpact');
      expect(day1).to.have.property('finalNetCapacity');
      expect(day1).to.have.property('maintenanceImpacts');
      expect(day1.maintenanceImpacts).to.have.property('definite');
      expect(day1.maintenanceImpacts).to.have.property('potential');
      
      // Verify the second day
      const day2 = result[1];
      expect(day2.date).to.equal('2023-12-16');
      
      // Verify service calls
      expect(standCapacityToolServiceStub.calledOnce).to.be.true;
      expect(maintenanceRequestServiceStub.calledOnce).to.be.true;
      expect(maintenanceRequestServiceStub.firstCall.args[0]).to.deep.include({
        startDate: '2023-12-15',
        endDate: '2023-12-16'
      });
    });
  });
}); 