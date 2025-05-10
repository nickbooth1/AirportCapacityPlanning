/**
 * Stand Capacity Service Tests
 */
const standCapacityService = require('../../src/services/standCapacityService');
const slotUtils = require('../../src/utils/slotUtils');
const Stand = require('../../src/models/Stand');
const AircraftType = require('../../src/models/AircraftType');
const TurnaroundRule = require('../../src/models/TurnaroundRule');
const OperationalSettings = require('../../src/models/OperationalSettings');
const StandAdjacencyRule = require('../../src/models/StandAdjacencyRule');
const TimeSlot = require('../../src/models/TimeSlot');

// Mock the models and dependencies
jest.mock('../../src/models/Stand');
jest.mock('../../src/models/AircraftType');
jest.mock('../../src/models/TurnaroundRule');
jest.mock('../../src/models/OperationalSettings');
jest.mock('../../src/models/StandAdjacencyRule');
jest.mock('../../src/models/TimeSlot');
jest.mock('../../src/utils/slotUtils');
jest.mock('../../src/db/knex', () => ({
  knex: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    then: jest.fn().mockResolvedValue([])
  })
}));

describe('StandCapacityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    Stand.query = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([
        { id: 1, code: 'A1', name: 'Stand A1', max_aircraft_size: 'C' },
        { id: 2, code: 'A2', name: 'Stand A2', max_aircraft_size: 'D' }
      ])
    });
    
    AircraftType.query = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { id: 1, iata_code: '320', icao_code: 'A320', name: 'Airbus A320', size_category: 'C' },
        { id: 2, iata_code: '788', icao_code: 'B788', name: 'Boeing 787-8', size_category: 'E' }
      ])
    });
    
    TurnaroundRule.query = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      withGraphFetched: jest.fn().mockReturnThis(),
      modifiers: jest.fn().mockResolvedValue([
        { id: 1, aircraft_type_id: 1, min_turnaround_minutes: 45, aircraftType: { id: 1, size_category: 'C' } },
        { id: 2, aircraft_type_id: 2, min_turnaround_minutes: 90, aircraftType: { id: 2, size_category: 'E' } }
      ])
    });
    
    OperationalSettings.getSettings = jest.fn().mockResolvedValue({
      id: 1,
      default_gap_minutes: 15,
      operating_start_time: '06:00:00',
      operating_end_time: '23:00:00',
      slot_duration_minutes: 10,
      slot_block_size: 6
    });
    
    slotUtils.calculateTotalSlots = jest.fn().mockReturnValue(102); // 17 hours at 10-minute slots
    slotUtils.getSlotEndTime = jest.fn().mockImplementation((startTime, index, duration) => {
      // Simple mock implementation
      const hour = 6 + Math.floor((index * duration) / 60);
      const minute = (index * duration) % 60;
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    });
  });
  
  test('fetchStands should return active stands', async () => {
    const stands = await standCapacityService.fetchStands();
    
    expect(Stand.query).toHaveBeenCalled();
    expect(stands).toHaveLength(2);
    expect(stands[0].code).toBe('A1');
    expect(stands[1].code).toBe('A2');
  });
  
  test('fetchAircraftTypes should return aircraft types', async () => {
    const types = await standCapacityService.fetchAircraftTypes();
    
    expect(AircraftType.query).toHaveBeenCalled();
    expect(types).toHaveLength(2);
    expect(types[0].iata_code).toBe('320');
    expect(types[1].iata_code).toBe('788');
  });
  
  test('fetchTurnaroundRules should return rules with aircraft types', async () => {
    const rules = await standCapacityService.fetchTurnaroundRules();
    
    expect(TurnaroundRule.query).toHaveBeenCalled();
    expect(rules).toHaveLength(2);
    expect(rules[0].min_turnaround_minutes).toBe(45);
    expect(rules[1].min_turnaround_minutes).toBe(90);
  });
  
  test('generateTimeSlots should create slots based on settings', () => {
    const settings = {
      operating_start_time: '06:00:00',
      operating_end_time: '23:00:00',
      slot_duration_minutes: 10
    };
    
    const slots = standCapacityService.generateTimeSlots(settings);
    
    expect(slotUtils.calculateTotalSlots).toHaveBeenCalledWith(
      '06:00:00', 
      '23:00:00', 
      10
    );
    expect(slots).toHaveLength(102);
    expect(slots[0].index).toBe(0);
  });
  
  test('calculateCapacity should fetch data and return capacity results', async () => {
    const date = '2024-08-15';
    const result = await standCapacityService.calculateCapacity(date);
    
    expect(result).toHaveProperty('calculation_timestamp');
    expect(result).toHaveProperty('operating_day', date);
    expect(result).toHaveProperty('capacity_summary.total_available_stand_hours');
    expect(result).toHaveProperty('capacity_by_hour');
    expect(result.capacity_by_hour).toHaveLength(24);
  });

  test('buildAdjacencyGraph should create a proper adjacency constraint map', () => {
    const mockAdjacencies = [
      { id: 1, stand_id: 1, adjacent_stand_id: 2, impact_direction: 'right', restriction_type: 'size_limited', max_aircraft_size_code: 'C', is_active: true },
      { id: 2, stand_id: 2, adjacent_stand_id: 1, impact_direction: 'left', restriction_type: 'size_limited', max_aircraft_size_code: 'D', is_active: true },
      { id: 3, stand_id: 1, adjacent_stand_id: 3, impact_direction: 'behind', restriction_type: 'no_use', max_aircraft_size_code: null, is_active: false }
    ];
    
    const graph = standCapacityService.buildAdjacencyGraph(mockAdjacencies);
    
    expect(graph).toHaveProperty('1');
    expect(graph).toHaveProperty('2');
    expect(graph).toHaveProperty('3');
    expect(graph['1']).toHaveLength(1); // Only active constraints
    expect(graph['2']).toHaveLength(1);
    expect(graph['3']).toHaveLength(0);
    
    const constraint = graph['1'][0];
    expect(constraint.adjacentStandId).toBe(2);
    expect(constraint.restrictionType).toBe('size_limited');
    expect(constraint.maxAircraftSize).toBe('C');
  });

  test('buildTurnaroundTimesBySizeMap should map size categories to turnaround times', () => {
    const mockTurnaroundRules = [
      { id: 1, aircraft_type_id: 1, min_turnaround_minutes: 50, aircraftType: { id: 1, size_category: 'C' } },
      { id: 2, aircraft_type_id: 2, min_turnaround_minutes: 100, aircraftType: { id: 2, size_category: 'E' } }
    ];
    
    const map = standCapacityService.buildTurnaroundTimesBySizeMap(mockTurnaroundRules);
    
    expect(map).toHaveProperty('A');
    expect(map).toHaveProperty('B');
    expect(map).toHaveProperty('C');
    expect(map).toHaveProperty('D');
    expect(map).toHaveProperty('E');
    expect(map).toHaveProperty('F');
    
    // Check that defaults are preserved
    expect(map['A']).toBe(30);
    expect(map['B']).toBe(35);
    
    // Check that values from rules override defaults
    expect(map['C']).toBe(50);
    expect(map['E']).toBe(100);
  });

  test('canPlaceAircraft should determine if placement is possible', () => {
    const standSlots = [
      { index: 0, occupied: false },
      { index: 1, occupied: false },
      { index: 2, occupied: false },
      { index: 3, occupied: true },  // Occupied
      { index: 4, occupied: false },
      { index: 5, occupied: false }
    ];
    
    const adjacencyConstraints = [];
    const maxAircraftSize = 'C';
    
    // Should be able to place 2 slots starting at index 0
    expect(standCapacityService.canPlaceAircraft(
      standSlots, 0, 2, maxAircraftSize, adjacencyConstraints
    )).toBe(true);
    
    // Should not be able to place 2 slots starting at index 2 (would overlap with occupied slot)
    expect(standCapacityService.canPlaceAircraft(
      standSlots, 2, 2, maxAircraftSize, adjacencyConstraints
    )).toBe(false);
    
    // Should be able to place 2 slots starting at index 4
    expect(standCapacityService.canPlaceAircraft(
      standSlots, 4, 2, maxAircraftSize, adjacencyConstraints
    )).toBe(true);
    
    // Should not be able to place 3 slots at the end (not enough slots left)
    expect(standCapacityService.canPlaceAircraft(
      standSlots, 4, 3, maxAircraftSize, adjacencyConstraints
    )).toBe(false);
  });

  test('occupySlots should mark slots as occupied', () => {
    const standSlots = [
      { index: 0, occupied: false, maxAircraftSize: null },
      { index: 1, occupied: false, maxAircraftSize: null },
      { index: 2, occupied: false, maxAircraftSize: null },
      { index: 3, occupied: false, maxAircraftSize: null }
    ];
    
    const startSlotIndex = 1;
    const occupationSlotCount = 2;
    const maxAircraftSize = 'D';
    
    standCapacityService.occupySlots(standSlots, startSlotIndex, occupationSlotCount, maxAircraftSize);
    
    expect(standSlots[0].occupied).toBe(false);
    expect(standSlots[1].occupied).toBe(true);
    expect(standSlots[1].maxAircraftSize).toBe('D');
    expect(standSlots[2].occupied).toBe(true);
    expect(standSlots[2].maxAircraftSize).toBe('D');
    expect(standSlots[3].occupied).toBe(false);
  });

  test('simulateStandUsage should calculate capacity correctly', () => {
    const standSlots = Array(24).fill().map((_, i) => ({
      index: i,
      occupied: false,
      maxAircraftSize: null
    }));
    
    const occupationSlotCount = 3; // Each aircraft takes 3 slots
    const maxAircraftSize = 'C';
    const adjacencyConstraints = [];
    
    const capacity = standCapacityService.simulateStandUsage(
      standSlots, 
      occupationSlotCount, 
      maxAircraftSize,
      adjacencyConstraints
    );
    
    // With 24 slots and 3 slots per aircraft, we should fit 8 aircraft
    expect(capacity).toBe(8);
    
    // Check that slots are marked correctly
    for (let i = 0; i < 24; i++) {
      if (i % 3 === 0 || i % 3 === 1 || i % 3 === 2) {
        expect(standSlots[i].occupied).toBe(true);
        expect(standSlots[i].maxAircraftSize).toBe('C');
      }
    }
  });

  test('should generate time slots correctly from operational settings', () => {
    const operationalSettings = {
      operating_start_time: '06:00:00',
      operating_end_time: '10:00:00',
      slot_duration_minutes: 60
    };
    
    const slots = standCapacityService.generateTimeSlots(operationalSettings);
    
    expect(slots).toHaveLength(4);
    expect(slots[0].name).toContain('06:00:00');
    expect(slots[3].name).toContain('09:00:00');
  });
  
  test('should calculate capacity for a specific time slot', () => {
    const timeSlot = {
      id: 1,
      name: 'Morning Peak',
      start_time: '06:00:00',
      end_time: '09:00:00'
    };
    
    const stands = [
      { id: 1, code: 'A1', compatible_aircraft_types: ['B738', 'A320'] },
      { id: 2, code: 'A2', compatible_aircraft_types: ['B738', 'A320', 'B777'] }
    ];
    
    const aircraftTypes = [
      { id: 1, code: 'B738', size_category: 'Code C' },
      { id: 2, code: 'A320', size_category: 'Code C' },
      { id: 3, code: 'B777', size_category: 'Code E' }
    ];
    
    const turnaroundRules = {
      'B738': { min_turnaround_minutes: 45 },
      'A320': { min_turnaround_minutes: 45 },
      'B777': { min_turnaround_minutes: 90 }
    };
    
    const adjacencyRules = [
      {
        id: 1,
        affected_stand_id: 2,
        restriction_type: 'MAX_AIRCRAFT_SIZE_REDUCED_TO',
        restricted_to_aircraft_type_or_size: 'Code C'
      }
    ];
    
    const gapBetweenFlights = 15;
    
    const result = standCapacityService.calculateCapacityForTimeSlot(
      timeSlot,
      stands,
      aircraftTypes,
      turnaroundRules,
      adjacencyRules,
      gapBetweenFlights
    );
    
    expect(result).toHaveProperty('bestCaseCapacity');
    expect(result).toHaveProperty('worstCaseCapacity');
    
    // Best case calculations:
    // Slot duration: 3 hours = 180 minutes
    // B738/A320: 45 + 15 = 60 min occupation time => 3 per stand x 2 stands = 6 each
    // B777: 90 + 15 = 105 min occupation time => 1 per stand x 1 stand = 1
    expect(result.bestCaseCapacity.B738).toBe(6);
    expect(result.bestCaseCapacity.A320).toBe(6);
    expect(result.bestCaseCapacity.B777).toBe(1);
    
    // Worst case should have restrictions applied
    expect(result.worstCaseCapacity.B738).toBeLessThanOrEqual(result.bestCaseCapacity.B738);
    expect(result.worstCaseCapacity.A320).toBeLessThanOrEqual(result.bestCaseCapacity.A320);
    expect(result.worstCaseCapacity.B777).toBeLessThanOrEqual(result.bestCaseCapacity.B777);
  });
  
  test('should calculate overall capacity correctly', async () => {
    const options = {
      useDefinedTimeSlots: true
    };
    
    const result = await standCapacityService.calculateStandCapacity(options);
    
    expect(result).toHaveProperty('bestCaseCapacity');
    expect(result).toHaveProperty('worstCaseCapacity');
    expect(result).toHaveProperty('timeSlots');
    expect(result).toHaveProperty('metadata');
    
    expect(result.metadata).toHaveProperty('calculatedAt');
    expect(result.metadata).toHaveProperty('operationalSettings');
    expect(result.metadata).toHaveProperty('stands');
    expect(result.metadata).toHaveProperty('aircraftTypes');
  });
  
  test('should handle filtering by stand IDs', async () => {
    const options = {
      useDefinedTimeSlots: true,
      standIds: [1]
    };
    
    const result = await standCapacityService.calculateStandCapacity(options);
    
    expect(result.metadata.stands).toHaveProperty('filtered');
  });
  
  test('should handle filtering by time slot IDs', async () => {
    const options = {
      useDefinedTimeSlots: true,
      timeSlotIds: [1]
    };
    
    const result = await standCapacityService.calculateStandCapacity(options);
    
    expect(result.timeSlots.length).toBe(1);
  });
  
  test('isAircraftSizeSmallEnough should correctly compare aircraft sizes', () => {
    // Test various size comparisons
    expect(standCapacityService.isAircraftSizeSmallEnough('Code A', 'Code C')).toBe(true);
    expect(standCapacityService.isAircraftSizeSmallEnough('Code C', 'Code C')).toBe(true);
    expect(standCapacityService.isAircraftSizeSmallEnough('Code F', 'Code C')).toBe(false);
    expect(standCapacityService.isAircraftSizeSmallEnough('Invalid', 'Code C')).toBe(false);
  });
}); 