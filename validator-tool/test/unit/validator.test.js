/**
 * Validator unit tests
 */
const validator = require('../../src/lib/validator');

describe('Validator Module', () => {
  // Test data
  const testData = [
    {
      FlightID: 'BA123',
      FlightNumber: '123',
      AirlineCode: 'BA',
      AircraftType: 'B738',
      Origin: 'LHR',
      Destination: 'JFK',
      ScheduledTime: '2023-06-01T08:30:00Z',
      Terminal: 'T5',
      IsArrival: false
    },
    {
      FlightID: 'LH456',
      FlightNumber: '456',
      AirlineCode: 'LH',
      AircraftType: 'A320',
      Origin: 'FRA',
      Destination: 'LHR',
      ScheduledTime: '2023-06-01T10:15:00Z',
      Terminal: 'T2',
      IsArrival: true
    }
  ];
  
  // Missing field test data
  const missingFieldData = [
    {
      FlightID: 'BA123',
      // Missing FlightNumber
      AirlineCode: 'BA',
      AircraftType: 'B738',
      Origin: 'LHR',
      Destination: 'JFK',
      ScheduledTime: '2023-06-01T08:30:00Z',
      Terminal: 'T5',
      IsArrival: false
    }
  ];
  
  // Invalid type test data
  const invalidTypeData = [
    {
      FlightID: 'BA123',
      FlightNumber: '123',
      AirlineCode: 'BA',
      AircraftType: 'B738',
      Origin: 'LHR',
      Destination: 'JFK',
      ScheduledTime: 'not-a-date',
      Terminal: 'T5',
      IsArrival: false
    }
  ];
  
  // Test Schema Validation
  describe('validateSchema', () => {
    it('should validate complete data with no errors', () => {
      const result = validator.validateSchema(testData, 'flights');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should detect missing required fields', () => {
      const result = validator.validateSchema(missingFieldData, 'flights');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].field).toBe('FlightNumber');
      expect(result.errors[0].code).toBe('E001');
    });
  });
  
  // Test Data Type Validation
  describe('validateDataTypes', () => {
    it('should validate correct data types with no errors', () => {
      const result = validator.validateDataTypes(testData, 'flights');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should detect invalid data types', () => {
      const result = validator.validateDataTypes(invalidTypeData, 'flights');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].field).toBe('ScheduledTime');
      expect(result.errors[0].code).toBe('E002');
    });
  });
  
  // Test Time Format Validation
  describe('validateTimeFormat', () => {
    it('should validate ISO format times', () => {
      expect(validator.validateTimeFormat('2023-06-01T08:30:00Z')).toBe(true);
    });
    
    it('should validate HH:MM format times', () => {
      expect(validator.validateTimeFormat('08:30')).toBe(true);
    });
    
    it('should reject invalid time formats', () => {
      expect(validator.validateTimeFormat('not-a-time')).toBe(false);
    });
  });
  
  // Test Combined Validation
  describe('validate', () => {
    it('should validate complete data with no errors', () => {
      const result = validator.validate(testData, 'flights');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should catch all types of errors', () => {
      const mixedData = [
        ...missingFieldData,
        ...invalidTypeData
      ];
      
      const result = validator.validate(mixedData, 'flights');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });
}); 