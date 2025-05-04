/**
 * Tests for slot utility functions
 */
const slotUtils = require('../../src/utils/slotUtils');

describe('SlotUtils', () => {
  describe('parseTimeToMinutes', () => {
    test('parses valid time strings correctly', () => {
      expect(slotUtils.parseTimeToMinutes('06:00:00')).toBe(360);
      expect(slotUtils.parseTimeToMinutes('12:30:00')).toBe(750);
      expect(slotUtils.parseTimeToMinutes('23:45:00')).toBe(1425);
      expect(slotUtils.parseTimeToMinutes('00:00:00')).toBe(0);
    });
    
    test('parses time without seconds', () => {
      expect(slotUtils.parseTimeToMinutes('06:00')).toBe(360);
      expect(slotUtils.parseTimeToMinutes('12:30')).toBe(750);
    });
    
    test('throws error for invalid time format', () => {
      expect(() => slotUtils.parseTimeToMinutes('6:00')).toThrow();
      expect(() => slotUtils.parseTimeToMinutes('25:00:00')).toThrow();
      expect(() => slotUtils.parseTimeToMinutes('12:60:00')).toThrow();
      expect(() => slotUtils.parseTimeToMinutes(null)).toThrow();
      expect(() => slotUtils.parseTimeToMinutes(undefined)).toThrow();
      expect(() => slotUtils.parseTimeToMinutes('invalid')).toThrow();
    });
  });
  
  describe('minutesToTimeString', () => {
    test('converts minutes to time strings correctly', () => {
      expect(slotUtils.minutesToTimeString(360)).toBe('06:00:00');
      expect(slotUtils.minutesToTimeString(750)).toBe('12:30:00');
      expect(slotUtils.minutesToTimeString(1425)).toBe('23:45:00');
      expect(slotUtils.minutesToTimeString(0)).toBe('00:00:00');
    });
    
    test('handles minutes beyond 24 hours', () => {
      expect(slotUtils.minutesToTimeString(1440)).toBe('00:00:00'); // 24 hours
      expect(slotUtils.minutesToTimeString(1500)).toBe('01:00:00'); // 25 hours
    });
    
    test('throws error for invalid minutes', () => {
      expect(() => slotUtils.minutesToTimeString(-10)).toThrow();
      expect(() => slotUtils.minutesToTimeString('invalid')).toThrow();
    });
  });
  
  describe('timeStringToSlotIndex', () => {
    test('converts time to slot index correctly', () => {
      // With 10 minute slots starting at 06:00
      expect(slotUtils.timeStringToSlotIndex('06:00:00', '06:00:00', 10)).toBe(0);
      expect(slotUtils.timeStringToSlotIndex('06:10:00', '06:00:00', 10)).toBe(1);
      expect(slotUtils.timeStringToSlotIndex('07:00:00', '06:00:00', 10)).toBe(6);
      expect(slotUtils.timeStringToSlotIndex('08:30:00', '06:00:00', 10)).toBe(15);
    });
    
    test('handles overnight correctly', () => {
      expect(slotUtils.timeStringToSlotIndex('01:00:00', '22:00:00', 15)).toBe(12); // 3 hours later
    });
  });
  
  describe('getSlotEndTime', () => {
    test('calculates slot end times correctly', () => {
      expect(slotUtils.getSlotEndTime('06:00:00', 0, 10)).toBe('06:10:00');
      expect(slotUtils.getSlotEndTime('06:00:00', 5, 10)).toBe('06:50:00');
      expect(slotUtils.getSlotEndTime('06:00:00', 6, 10)).toBe('07:00:00');
    });
    
    test('handles overnight slots', () => {
      expect(slotUtils.getSlotEndTime('23:00:00', 9, 10)).toBe('00:30:00');
    });
  });
  
  describe('getSlotStartTime', () => {
    test('calculates slot start times correctly', () => {
      expect(slotUtils.getSlotStartTime('06:00:00', 0, 10)).toBe('06:00:00');
      expect(slotUtils.getSlotStartTime('06:00:00', 5, 10)).toBe('06:40:00');
      expect(slotUtils.getSlotStartTime('06:00:00', 6, 10)).toBe('06:50:00');
    });
    
    test('handles overnight slots', () => {
      expect(slotUtils.getSlotStartTime('23:00:00', 9, 10)).toBe('00:20:00');
    });
  });
  
  describe('calculateTotalSlots', () => {
    test('calculates total slots correctly', () => {
      expect(slotUtils.calculateTotalSlots('06:00:00', '07:00:00', 10)).toBe(6);
      expect(slotUtils.calculateTotalSlots('06:00:00', '07:00:00', 15)).toBe(4);
      expect(slotUtils.calculateTotalSlots('06:00:00', '22:00:00', 10)).toBe(96);
    });
    
    test('handles overnight correctly', () => {
      expect(slotUtils.calculateTotalSlots('22:00:00', '06:00:00', 15)).toBe(32); // 8 hours = 480 min, 480/15 = 32
    });
  });
  
  describe('groupSlotsIntoBlocks', () => {
    test('groups slots into blocks correctly', () => {
      const slots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const blocks = slotUtils.groupSlotsIntoBlocks(slots, 3);
      
      expect(blocks).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    });
    
    test('handles empty input', () => {
      expect(slotUtils.groupSlotsIntoBlocks([], 3)).toEqual([]);
      expect(slotUtils.groupSlotsIntoBlocks(null, 3)).toEqual([]);
    });
  });
  
  describe('isTimeWithinOperatingHours', () => {
    test('checks time within regular operating hours', () => {
      expect(slotUtils.isTimeWithinOperatingHours('08:00:00', '06:00:00', '22:00:00')).toBe(true);
      expect(slotUtils.isTimeWithinOperatingHours('06:00:00', '06:00:00', '22:00:00')).toBe(true);
      expect(slotUtils.isTimeWithinOperatingHours('21:59:00', '06:00:00', '22:00:00')).toBe(true);
      expect(slotUtils.isTimeWithinOperatingHours('05:59:00', '06:00:00', '22:00:00')).toBe(false);
      expect(slotUtils.isTimeWithinOperatingHours('22:00:00', '06:00:00', '22:00:00')).toBe(false);
    });
    
    test('checks time within overnight operating hours', () => {
      expect(slotUtils.isTimeWithinOperatingHours('23:00:00', '22:00:00', '06:00:00')).toBe(true);
      expect(slotUtils.isTimeWithinOperatingHours('01:00:00', '22:00:00', '06:00:00')).toBe(true);
      expect(slotUtils.isTimeWithinOperatingHours('22:00:00', '22:00:00', '06:00:00')).toBe(true);
      expect(slotUtils.isTimeWithinOperatingHours('05:59:00', '22:00:00', '06:00:00')).toBe(true);
      expect(slotUtils.isTimeWithinOperatingHours('06:00:00', '22:00:00', '06:00:00')).toBe(false);
      expect(slotUtils.isTimeWithinOperatingHours('12:00:00', '22:00:00', '06:00:00')).toBe(false);
    });
  });
  
  describe('calculateRequiredSlots', () => {
    test('calculates required slots correctly', () => {
      expect(slotUtils.calculateRequiredSlots(10, 10)).toBe(1);
      expect(slotUtils.calculateRequiredSlots(15, 10)).toBe(2);
      expect(slotUtils.calculateRequiredSlots(45, 10)).toBe(5);
      expect(slotUtils.calculateRequiredSlots(0, 10)).toBe(0);
    });
  });
  
  describe('createSlotMap', () => {
    test('creates slot map correctly for a time period', () => {
      const slotMap = slotUtils.createSlotMap('06:00:00', '07:00:00', 10);
      
      expect(slotMap).toHaveLength(6);
      expect(slotMap[0].index).toBe(0);
      expect(slotMap[0].startTime).toBe('06:00:00');
      expect(slotMap[0].endTime).toBe('06:10:00');
      expect(slotMap[0].hour).toBe(6);
      
      expect(slotMap[5].index).toBe(5);
      expect(slotMap[5].startTime).toBe('06:50:00');
      expect(slotMap[5].endTime).toBe('07:00:00');
      expect(slotMap[5].hour).toBe(6);
    });
    
    test('handles overnight slots', () => {
      const slotMap = slotUtils.createSlotMap('23:00:00', '01:00:00', 30);
      
      expect(slotMap).toHaveLength(4);
      expect(slotMap[0].startTime).toBe('23:00:00');
      expect(slotMap[0].hour).toBe(23);
      
      expect(slotMap[2].startTime).toBe('00:00:00');
      expect(slotMap[2].hour).toBe(0);
    });
  });
}); 