const { expect } = require('chai');
const TimeSlot = require('../../services/adapted/models/timeSlot');

describe('TimeSlot Model', () => {
  describe('constructor', () => {
    it('should create a valid time slot', () => {
      const timeSlot = new TimeSlot({
        startTime: '08:00:00',
        endTime: '10:00:00'
      });
      
      expect(timeSlot.startTime).to.equal('08:00:00');
      expect(timeSlot.endTime).to.equal('10:00:00');
      expect(timeSlot.label).to.equal('08:00 - 10:00');
    });
    
    it('should use provided label', () => {
      const timeSlot = new TimeSlot({
        startTime: '08:00:00',
        endTime: '10:00:00',
        label: 'Morning'
      });
      
      expect(timeSlot.label).to.equal('Morning');
    });
    
    it('should throw error on invalid start time format', () => {
      expect(() => new TimeSlot({
        startTime: '8:00',
        endTime: '10:00:00'
      })).to.throw(/Invalid start time format/);
    });
    
    it('should throw error on invalid end time format', () => {
      expect(() => new TimeSlot({
        startTime: '08:00:00',
        endTime: '10:00'
      })).to.throw(/Invalid end time format/);
    });
    
    it('should throw error if end time is before start time', () => {
      expect(() => new TimeSlot({
        startTime: '10:00:00',
        endTime: '08:00:00'
      })).to.throw(/End time must be after start time/);
    });
  });
  
  describe('getDurationMinutes', () => {
    it('should calculate duration correctly', () => {
      const timeSlot = new TimeSlot({
        startTime: '08:00:00',
        endTime: '10:00:00'
      });
      
      expect(timeSlot.getDurationMinutes()).to.equal(120);
    });
    
    it('should handle overnight time slots', () => {
      const timeSlot = new TimeSlot({
        startTime: '22:00:00',
        endTime: '02:00:00'
      });
      
      expect(timeSlot.getDurationMinutes()).to.equal(240);
    });
  });
  
  describe('overlaps', () => {
    it('should detect overlapping time slots', () => {
      const slot1 = new TimeSlot({
        startTime: '08:00:00',
        endTime: '10:00:00'
      });
      
      const slot2 = new TimeSlot({
        startTime: '09:00:00',
        endTime: '11:00:00'
      });
      
      expect(slot1.overlaps(slot2)).to.be.true;
    });
    
    it('should detect non-overlapping time slots', () => {
      const slot1 = new TimeSlot({
        startTime: '08:00:00',
        endTime: '10:00:00'
      });
      
      const slot2 = new TimeSlot({
        startTime: '11:00:00',
        endTime: '13:00:00'
      });
      
      expect(slot1.overlaps(slot2)).to.be.false;
    });
  });
  
  describe('generateForDay', () => {
    it('should generate time slots for a day', () => {
      const settings = {
        slotDurationMinutes: 60,
        operatingDayStartTime: '06:00:00',
        operatingDayEndTime: '10:00:00'
      };
      
      const slots = TimeSlot.generateForDay(settings);
      
      expect(slots).to.have.length(4);
      expect(slots[0].startTime).to.equal('06:00:00');
      expect(slots[0].endTime).to.equal('07:00:00');
      expect(slots[3].startTime).to.equal('09:00:00');
      expect(slots[3].endTime).to.equal('10:00:00');
    });
    
    it('should handle overnight operating hours', () => {
      const settings = {
        slotDurationMinutes: 120,
        operatingDayStartTime: '22:00:00',
        operatingDayEndTime: '02:00:00'
      };
      
      const slots = TimeSlot.generateForDay(settings);
      
      expect(slots).to.have.length(2);
      expect(slots[0].startTime).to.equal('22:00:00');
      expect(slots[0].endTime).to.equal('00:00:00');
      expect(slots[1].startTime).to.equal('00:00:00');
      expect(slots[1].endTime).to.equal('02:00:00');
    });
  });
}); 