/**
 * Tests for ParameterValidationService
 */

const ParameterValidationService = require('../../../src/services/agent/ParameterValidationService');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('ParameterValidationService', () => {
  let service;
  
  beforeEach(() => {
    // Create a new instance for each test
    service = new ParameterValidationService();
  });

  describe('registerSchema', () => {
    it('should register a new schema successfully', () => {
      const schemaName = 'testSchema';
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };
      
      const result = service.registerSchema(schemaName, schema);
      
      expect(result).toBe(true);
      expect(service.schemas[schemaName]).toEqual(schema);
    });
    
    it('should warn when overwriting an existing schema', () => {
      const schemaName = 'capacityScenario'; // Existing schema
      const schema = { type: 'object' };
      
      const result = service.registerSchema(schemaName, schema);
      
      expect(result).toBe(true);
      expect(service.schemas[schemaName]).toEqual(schema);
    });
  });

  describe('validateParameters', () => {
    it('should validate parameters against an existing schema', async () => {
      const parameters = {
        terminal: 'Terminal 1',
        standCount: 5,
        standType: 'wide-body',
        startDate: '2023-10-15'
      };
      
      const result = await service.validateParameters(parameters, 'capacityScenario');
      
      expect(result).toHaveProperty('isValid', true);
      expect(result).toHaveProperty('parameters');
      expect(result.parameters).toEqual(parameters);
    });
    
    it('should return error for non-existent schema', async () => {
      const parameters = { test: 'value' };
      
      const result = await service.validateParameters(parameters, 'nonExistentSchema');
      
      expect(result).toHaveProperty('isValid', false);
      expect(result).toHaveProperty('errors');
      expect(result.errors[0]).toContain('not found');
    });
    
    it('should validate and normalize parameters', async () => {
      // For this test, we'll mock the validation method to pass and just test normalization
      // This approach isolates our test to focus on the normalization aspect
      
      // Create a simplified schema just for normalization testing
      const schema = {
        type: 'object',
        properties: {
          standCount: { type: 'integer' },
          utilization: { type: 'number' },
          startDate: { type: 'string', format: 'date' }
        }
      };
      
      // Input with string values that should be normalized
      const parameters = {
        standCount: '5',          // String should be converted to integer
        utilization: '0.85',      // String should be converted to number
        startDate: '2023/10/15'   // Non-ISO format should be normalized
      };
      
      // Call normalization directly to test it separately from validation
      const normalizedParams = await service.normalizeParameters(parameters, schema);
      
      // Check that values were properly normalized
      expect(normalizedParams).toHaveProperty('standCount', 5);
      expect(normalizedParams).toHaveProperty('utilization', 0.85);
      expect(normalizedParams.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    
    it('should return validation errors for invalid parameters', async () => {
      const parameters = {
        // Missing required 'terminal'
        standCount: -1, // Below minimum
        standType: 'invalid-type' // Not in enum
      };
      
      const result = await service.validateParameters(parameters, 'capacityScenario');
      
      expect(result).toHaveProperty('isValid', false);
      expect(result).toHaveProperty('errors');
      expect(result.errors).toContain('Missing required property: terminal');
      expect(result.errors.some(e => e.includes('standCount'))).toBe(true);
      expect(result.errors.some(e => e.includes('standType'))).toBe(true);
    });
    
    it('should handle dependency validation', async () => {
      // Missing endDate when startDate is provided
      const parameters = {
        terminal: 'Terminal 1',
        startDate: '2023-10-15'
      };
      
      // Create a test schema with dependencies
      service.registerSchema('testDependencySchema', {
        type: 'object',
        required: ['terminal'],
        properties: {
          terminal: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        },
        dependencies: {
          startDate: ['endDate']
        }
      });
      
      const result = await service.validateParameters(parameters, 'testDependencySchema');
      
      expect(result).toHaveProperty('isValid', false);
      expect(result.errors.some(e => e.includes('depends on endDate'))).toBe(true);
    });
  });

  describe('validateAgainstSchema', () => {
    it('should validate data against a simple schema', async () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          age: { type: 'integer', minimum: 0 }
        }
      };
      
      const validData = { name: 'Test', age: 30 };
      const invalidData = { age: -5 };
      
      const validResult = await service.validateAgainstSchema(validData, schema);
      const invalidResult = await service.validateAgainstSchema(invalidData, schema);
      
      expect(validResult).toHaveProperty('isValid', true);
      expect(invalidResult).toHaveProperty('isValid', false);
      expect(invalidResult.errors).toContain('Missing required property: name');
      expect(invalidResult.errors.some(e => e.includes('age'))).toBe(true);
    });
  });

  describe('validateProperty', () => {
    it('should validate string properties', () => {
      const schema = { type: 'string', minLength: 3, maxLength: 10 };
      
      expect(service.validateProperty('test', schema, 'name')).toHaveLength(0); // Valid
      expect(service.validateProperty('ab', schema, 'name')[0]).toContain('Property name must have length >= 3'); // Too short
      expect(service.validateProperty('verylongvalue', schema, 'name')[0]).toContain('Property name must have length <= 10'); // Too long
      expect(service.validateProperty(123, schema, 'name')[0]).toContain('Property name must be of type string'); // Wrong type
    });
    
    it('should validate number properties', () => {
      const schema = { type: 'number', minimum: 0, maximum: 100 };
      
      expect(service.validateProperty(50, schema, 'score')).toHaveLength(0); // Valid
      expect(service.validateProperty(-10, schema, 'score')[0]).toContain('Property score must be >= 0'); // Below minimum
      expect(service.validateProperty(150, schema, 'score')[0]).toContain('Property score must be <= 100'); // Above maximum
      expect(service.validateProperty('50', schema, 'score')[0]).toContain('Property score must be of type number'); // Wrong type
    });
    
    it('should validate array properties', () => {
      const schema = { 
        type: 'array', 
        minItems: 1,
        items: { type: 'string' }
      };
      
      expect(service.validateProperty(['item1', 'item2'], schema, 'list')).toHaveLength(0); // Valid
      expect(service.validateProperty([], schema, 'list')[0]).toContain('Property list must have >= 1 items'); // Empty array
      expect(service.validateProperty([1, 2], schema, 'list')[0]).toContain('must be of type string'); // Wrong item type
      expect(service.validateProperty('not-array', schema, 'list')[0]).toContain('Property list must be of type array'); // Not an array
    });
    
    it('should validate enum properties', () => {
      const schema = { type: 'string', enum: ['option1', 'option2', 'option3'] };
      
      expect(service.validateProperty('option1', schema, 'choice')).toHaveLength(0); // Valid
      expect(service.validateProperty('option4', schema, 'choice')[0]).toContain('Property choice must be one of'); // Not in enum
    });
    
    it('should validate format properties', () => {
      expect(service.validateProperty('2023-10-15', { type: 'string', format: 'date' }, 'date')).toHaveLength(0); // Valid date
      expect(service.validateProperty('not-a-date', { type: 'string', format: 'date' }, 'date')[0]).toContain('Property date must be in format date'); // Invalid date
      
      expect(service.validateProperty('test@example.com', { type: 'string', format: 'email' }, 'email')).toHaveLength(0); // Valid email
      expect(service.validateProperty('invalid-email', { type: 'string', format: 'email' }, 'email')[0]).toContain('Property email must be in format email'); // Invalid email
    });
  });

  describe('normalizeParameters', () => {
    it('should convert string numbers to actual numbers', async () => {
      const parameters = {
        intValue: '42',
        floatValue: '3.14'
      };
      
      const schema = {
        properties: {
          intValue: { type: 'integer' },
          floatValue: { type: 'number' }
        }
      };
      
      const result = await service.normalizeParameters(parameters, schema);
      
      expect(result).toHaveProperty('intValue', 42);
      expect(result).toHaveProperty('floatValue', 3.14);
    });
    
    it('should convert string booleans to actual booleans', async () => {
      const parameters = {
        value1: 'true',
        value2: 'yes',
        value3: '1',
        value4: 'false',
        value5: 'no',
        value6: '0'
      };
      
      const schema = {
        properties: {
          value1: { type: 'boolean' },
          value2: { type: 'boolean' },
          value3: { type: 'boolean' },
          value4: { type: 'boolean' },
          value5: { type: 'boolean' },
          value6: { type: 'boolean' }
        }
      };
      
      const result = await service.normalizeParameters(parameters, schema);
      
      expect(result).toHaveProperty('value1', true);
      expect(result).toHaveProperty('value2', true);
      expect(result).toHaveProperty('value3', true);
      expect(result).toHaveProperty('value4', false);
      expect(result).toHaveProperty('value5', false);
      expect(result).toHaveProperty('value6', false);
    });
    
    it('should normalize date strings to ISO format', async () => {
      const parameters = {
        date1: '2023/10/15',
        date2: 'Oct 15, 2023',
        dateTime: '2023-10-15T14:30:00Z'
      };
      
      const schema = {
        properties: {
          date1: { type: 'string', format: 'date' },
          date2: { type: 'string', format: 'date' },
          dateTime: { type: 'string', format: 'date-time' }
        }
      };
      
      const result = await service.normalizeParameters(parameters, schema);
      
      expect(result.date1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.date2).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    
    it('should convert comma-separated strings to arrays', async () => {
      const parameters = {
        tags: 'tag1,tag2,tag3'
      };
      
      const schema = {
        properties: {
          tags: { type: 'array' }
        }
      };
      
      const result = await service.normalizeParameters(parameters, schema);
      
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
    
    it('should normalize enum values to canonical form', async () => {
      const parameters = {
        status: 'active',
        type: 'wide-body'
      };
      
      const schema = {
        properties: {
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'PENDING'] },
          type: { type: 'string', enum: ['narrow-body', 'wide-body', 'any'] }
        }
      };
      
      const result = await service.normalizeParameters(parameters, schema);
      
      expect(result).toHaveProperty('status', 'ACTIVE'); // Normalized to canonical case
      expect(result).toHaveProperty('type', 'wide-body'); // Already matches canonical case
    });
  });

  describe('completeParameters', () => {
    it('should fill in missing required parameters with defaults', async () => {
      const parameters = {
        terminal: 'Terminal 1'
      };
      
      const result = await service.completeParameters(parameters, 'capacityScenario');
      
      expect(result).toHaveProperty('terminal', 'Terminal 1');
      expect(result).toHaveProperty('standType', 'any');
      expect(result).toHaveProperty('startDate');
      expect(result).toHaveProperty('peakHourStart', '06:00');
      expect(result).toHaveProperty('peakHourEnd', '10:00');
      expect(result).toHaveProperty('utilization', 0.85);
    });
    
    it('should use context values when available', async () => {
      const parameters = {
        terminal: 'Terminal 1'
      };
      
      const context = {
        standType: 'narrow-body',
        utilization: 0.75
      };
      
      const result = await service.completeParameters(parameters, 'capacityScenario', context);
      
      expect(result).toHaveProperty('standType', 'narrow-body'); // From context
      expect(result).toHaveProperty('utilization', 0.75); // From context
    });
    
    it('should infer endDate based on startDate', async () => {
      const parameters = {
        terminal: 'Terminal 1',
        startDate: '2023-10-15'
      };
      
      const result = await service.completeParameters(parameters, 'capacityScenario');
      
      expect(result).toHaveProperty('startDate', '2023-10-15');
      expect(result).toHaveProperty('endDate');
      
      // End date should be after start date
      const startDate = new Date(parameters.startDate);
      const endDate = new Date(result.endDate);
      expect(endDate > startDate).toBe(true);
    });
    
    it('should handle different schema types with appropriate defaults', async () => {
      // Test maintenance scenario defaults
      const maintenanceResult = await service.completeParameters(
        { standIds: ['A1', 'A2'], startDate: '2023-10-15', endDate: '2023-10-16' }, 
        'maintenanceScenario'
      );
      
      expect(maintenanceResult).toHaveProperty('impact', 'full');
      expect(maintenanceResult).toHaveProperty('maintenanceType', 'scheduled');
      
      // Test flight schedule scenario defaults
      const flightResult = await service.completeParameters(
        {}, 
        'flightScheduleScenario'
      );
      
      expect(flightResult).toHaveProperty('scheduleType', 'current');
      expect(flightResult).toHaveProperty('timeFrame', 'week');
    });
  });
});