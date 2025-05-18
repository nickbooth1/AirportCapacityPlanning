/**
 * Unit tests for ParameterValidationService
 */

const ParameterValidationService = require('../../../src/services/agent/ParameterValidationService');

describe('ParameterValidationService', () => {
  let validationService;

  beforeEach(() => {
    validationService = new ParameterValidationService();
  });

  describe('validateParameters', () => {
    it('should validate parameters against a known schema', async () => {
      // Create a test schema
      validationService.registerSchema('testSchema', {
        type: 'object',
        required: ['requiredField'],
        properties: {
          requiredField: { type: 'string' },
          optionalNumber: { type: 'number', minimum: 0 },
          optionalEnum: { type: 'string', enum: ['option1', 'option2'] }
        }
      });

      // Valid parameters
      const validParams = {
        requiredField: 'test',
        optionalNumber: 10,
        optionalEnum: 'option1'
      };

      const result = await validationService.validateParameters(validParams, 'testSchema');
      
      expect(result.isValid).toBe(true);
      expect(result.parameters).toBeDefined();
    });

    it('should return validation errors for invalid parameters', async () => {
      // Create a test schema
      validationService.registerSchema('testSchema', {
        type: 'object',
        required: ['requiredField'],
        properties: {
          requiredField: { type: 'string' },
          optionalNumber: { type: 'number', minimum: 0 },
          optionalEnum: { type: 'string', enum: ['option1', 'option2'] }
        }
      });

      // Invalid parameters (missing required field)
      const invalidParams = {
        optionalNumber: -5, // Also invalid - below minimum
        optionalEnum: 'option3' // Invalid - not in enum
      };

      const result = await validationService.validateParameters(invalidParams, 'testSchema');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required property: requiredField');
      expect(result.errors).toContain('Property optionalNumber must be >= 0');
      expect(result.errors).toContain('Property optionalEnum must be one of: option1, option2');
    });

    it('should handle non-existent schemas', async () => {
      const params = { someField: 'value' };
      const result = await validationService.validateParameters(params, 'nonExistentSchema');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Schema nonExistentSchema not found');
    });
  });

  describe('validateType', () => {
    it('should validate string type correctly', () => {
      expect(validationService.validateType('test', 'string')).toBe(true);
      expect(validationService.validateType(123, 'string')).toBe(false);
    });

    it('should validate number type correctly', () => {
      expect(validationService.validateType(123, 'number')).toBe(true);
      expect(validationService.validateType('123', 'number')).toBe(false);
    });

    it('should validate integer type correctly', () => {
      expect(validationService.validateType(123, 'integer')).toBe(true);
      expect(validationService.validateType(123.5, 'integer')).toBe(false);
    });

    it('should validate boolean type correctly', () => {
      expect(validationService.validateType(true, 'boolean')).toBe(true);
      expect(validationService.validateType('true', 'boolean')).toBe(false);
    });

    it('should validate array type correctly', () => {
      expect(validationService.validateType([1, 2, 3], 'array')).toBe(true);
      expect(validationService.validateType({ a: 1 }, 'array')).toBe(false);
    });

    it('should validate object type correctly', () => {
      expect(validationService.validateType({ a: 1 }, 'object')).toBe(true);
      expect(validationService.validateType([1, 2, 3], 'object')).toBe(false);
    });
  });

  describe('validateFormat', () => {
    it('should validate date format correctly', () => {
      expect(validationService.validateFormat('2023-05-15', 'date')).toBe(true);
      expect(validationService.validateFormat('2023/05/15', 'date')).toBe(false);
      expect(validationService.validateFormat('not-a-date', 'date')).toBe(false);
    });

    it('should validate date-time format correctly', () => {
      expect(validationService.validateFormat('2023-05-15T14:30:00Z', 'date-time')).toBe(true);
      expect(validationService.validateFormat('not-a-datetime', 'date-time')).toBe(false);
    });

    it('should validate time format correctly', () => {
      expect(validationService.validateFormat('14:30', 'time')).toBe(true);
      expect(validationService.validateFormat('24:30', 'time')).toBe(false);
      expect(validationService.validateFormat('not-a-time', 'time')).toBe(false);
    });

    it('should validate email format correctly', () => {
      expect(validationService.validateFormat('test@example.com', 'email')).toBe(true);
      expect(validationService.validateFormat('not-an-email', 'email')).toBe(false);
    });

    it('should validate URI format correctly', () => {
      expect(validationService.validateFormat('https://example.com', 'uri')).toBe(true);
      expect(validationService.validateFormat('not-a-uri', 'uri')).toBe(false);
    });
  });

  describe('normalizeParameters', () => {
    it('should convert string numbers to actual numbers', async () => {
      const schema = {
        properties: {
          integerValue: { type: 'integer' },
          numberValue: { type: 'number' }
        }
      };

      const params = {
        integerValue: '123',
        numberValue: '123.45'
      };

      const normalized = await validationService.normalizeParameters(params, schema);
      
      expect(normalized.integerValue).toBe(123);
      expect(normalized.numberValue).toBe(123.45);
    });

    it('should convert string booleans to actual booleans', async () => {
      const schema = {
        properties: {
          boolValue1: { type: 'boolean' },
          boolValue2: { type: 'boolean' },
          boolValue3: { type: 'boolean' }
        }
      };

      const params = {
        boolValue1: 'true',
        boolValue2: 'yes',
        boolValue3: '1'
      };

      const normalized = await validationService.normalizeParameters(params, schema);
      
      expect(normalized.boolValue1).toBe(true);
      expect(normalized.boolValue2).toBe(true);
      expect(normalized.boolValue3).toBe(true);
    });

    it('should convert non-array values to arrays when schema expects array', async () => {
      const schema = {
        properties: {
          arrayValue: { type: 'array' }
        }
      };

      const params = {
        arrayValue: 'item1, item2, item3'
      };

      const normalized = await validationService.normalizeParameters(params, schema);
      
      expect(Array.isArray(normalized.arrayValue)).toBe(true);
      expect(normalized.arrayValue).toEqual(['item1', 'item2', 'item3']);
    });

    it('should normalize date strings to ISO format', async () => {
      const schema = {
        properties: {
          dateValue: { type: 'string', format: 'date' }
        }
      };

      const params = {
        dateValue: '5/15/2023'
      };

      const normalized = await validationService.normalizeParameters(params, schema);
      
      // The exact formatting might depend on your implementation
      expect(normalized.dateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should match canonical case for enum values', async () => {
      const schema = {
        properties: {
          enumValue: { 
            type: 'string', 
            enum: ['Option1', 'Option2', 'Option3'] 
          }
        }
      };

      const params = {
        enumValue: 'option2'
      };

      const normalized = await validationService.normalizeParameters(params, schema);
      
      expect(normalized.enumValue).toBe('Option2');
    });
  });

  describe('completeParameters', () => {
    it('should fill in missing parameters with default values', async () => {
      const schema = {
        properties: {
          param1: { default: 'defaultValue' },
          param2: { type: 'number' }
        }
      };

      validationService.registerSchema('defaultsSchema', schema);

      const params = {
        param2: 123
      };

      const completed = await validationService.completeParameters(params, 'defaultsSchema');
      
      expect(completed.param1).toBe('defaultValue');
      expect(completed.param2).toBe(123);
    });

    it('should infer parameters based on context', async () => {
      const schema = {
        properties: {
          param1: { type: 'string' },
          param2: { type: 'number' }
        }
      };

      validationService.registerSchema('inferSchema', schema);

      const params = {
        param1: 'value1'
      };

      const context = {
        param2: 456
      };

      const completed = await validationService.completeParameters(params, 'inferSchema', context);
      
      expect(completed.param1).toBe('value1');
      expect(completed.param2).toBe(456);
    });

    it('should use specific inference rules for known parameters', async () => {
      const schema = {
        properties: {
          standType: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          utilization: { type: 'number' }
        }
      };

      // Add inference rules for the parameters
      validationService.inferenceRules = {
        standType: () => 'any',
        utilization: () => 0.85,
        startDate: () => new Date().toISOString().split('T')[0]
      };

      validationService.registerSchema('airportSchema', schema);

      const params = {};

      const completed = await validationService.completeParameters(params, 'airportSchema');
      
      expect(completed.standType).toBe('any'); // Default from inference rule
      expect(completed.startDate).toBeTruthy(); // Should be today's date
      expect(completed.utilization).toBe(0.85); // Default from inference rule
    });
  });

  describe('registerSchema', () => {
    it('should register a new schema', () => {
      const newSchema = {
        type: 'object',
        properties: {
          field1: { type: 'string' }
        }
      };

      const result = validationService.registerSchema('newSchema', newSchema);
      
      expect(result).toBe(true);
      
      // Verify the schema was registered by using it
      return validationService.validateParameters({ field1: 'test' }, 'newSchema')
        .then(validation => {
          expect(validation.isValid).toBe(true);
        });
    });

    it('should overwrite existing schema when registering with same name', () => {
      const schema1 = {
        type: 'object',
        required: ['field1'],
        properties: {
          field1: { type: 'string' }
        }
      };

      const schema2 = {
        type: 'object',
        required: ['field2'],
        properties: {
          field2: { type: 'number' }
        }
      };

      // Register first schema
      validationService.registerSchema('overwriteTest', schema1);
      
      // Validate against first schema - should require field1
      return validationService.validateParameters({ field2: 123 }, 'overwriteTest')
        .then(validation1 => {
          expect(validation1.isValid).toBe(false);
          expect(validation1.errors).toContain('Missing required property: field1');
          
          // Register second schema with same name
          validationService.registerSchema('overwriteTest', schema2);
          
          // Validate against second schema - should now require field2
          return validationService.validateParameters({ field1: 'test' }, 'overwriteTest');
        })
        .then(validation2 => {
          expect(validation2.isValid).toBe(false);
          expect(validation2.errors).toContain('Missing required property: field2');
        });
    });
  });
});