/**
 * Tests for OperationParameterValidator
 */

const OperationParameterValidator = require('../../../../src/services/agent/nlp/OperationParameterValidator');

// Mock repository service
const mockRepositoryValidationService = {
  validateTerminal: jest.fn(),
  validateStandId: jest.fn()
};

// Real validator with mock services
const validator = OperationParameterValidator;
validator.repositoryValidationService = mockRepositoryValidationService;

describe('OperationParameterValidator', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for repository validations
    mockRepositoryValidationService.validateTerminal.mockResolvedValue({ valid: true });
    mockRepositoryValidationService.validateStandId.mockReturnValue(true);
  });

  describe('validateParameters', () => {
    it('should validate create_stand parameters successfully', async () => {
      const params = {
        name: 'A12',
        terminal: 'T1',
        type: 'contact',
        size: 'medium'
      };

      const result = await validator.validateParameters('create_stand', params);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockRepositoryValidationService.validateTerminal).toHaveBeenCalledWith('T1');
    });

    it('should return errors for invalid create_stand parameters', async () => {
      const params = {
        name: 'Stand with invalid format',
        // terminal missing (required)
        type: 123 // wrong type
      };

      const result = await validator.validateParameters('create_stand', params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Missing required parameter: terminal'),
        expect.stringContaining('Parameter \'name\' should be of type string'),
        expect.stringContaining('Stand name must be')
      ]));
    });

    it('should validate create_maintenance with date constraints', async () => {
      const validParams = {
        stand: 'A12',
        startDate: '2023-10-15',
        endDate: '2023-10-20',
        type: 'scheduled'
      };

      const result = await validator.validateParameters('create_maintenance', validParams);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockRepositoryValidationService.validateStandId).toHaveBeenCalledWith('A12');

      // Test with invalid date range
      const invalidParams = {
        stand: 'A12',
        startDate: '2023-10-20',
        endDate: '2023-10-15', // End before start
        type: 'scheduled'
      };

      const invalidResult = await validator.validateParameters('create_maintenance', invalidParams);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('End date must be after start date')
      ]));
    });

    it('should validate update_terminal parameters', async () => {
      const params = {
        identifier: 'T1',
        name: 'Terminal 1 Updated',
        code: 'T1A'
      };

      const result = await validator.validateParameters('update_terminal', params);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Test with invalid code
      const invalidParams = {
        identifier: 'T1',
        name: 'Terminal 1 Updated',
        code: 'Terminal Code Too Long'
      };

      const invalidResult = await validator.validateParameters('update_terminal', invalidParams);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Terminal code must be')
      ]));
    });

    it('should validate delete operations', async () => {
      const params = {
        identifier: 'A12',
        force: true
      };

      const result = await validator.validateParameters('delete_stand', params);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Test with missing identifier
      const invalidParams = {
        force: true
      };

      const invalidResult = await validator.validateParameters('delete_stand', invalidParams);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Missing required parameter: identifier')
      ]));
    });

    it('should handle non-existent schema', async () => {
      const result = await validator.validateParameters('unknown_operation', { param: 'value' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('No validation schema found for operation type')
      ]));
    });

    it('should validate entity existence for update operations', async () => {
      // Mock terminal as non-existent
      mockRepositoryValidationService.validateTerminal.mockResolvedValueOnce({ valid: false });
      
      const params = {
        identifier: 'T1',
        name: 'Updated Terminal'
      };

      const result = await validator.validateParameters('update_terminal', params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('terminal with identifier \'T1\' doesn\'t exist')
      ]));
    });

    it('should normalize parameter types correctly', async () => {
      const params = {
        name: 'A12',
        terminal: 'T1',
        contact: 'yes', // string boolean
        size: 'large'
      };

      const result = await validator.validateParameters('create_stand', params);
      
      expect(result.isValid).toBe(true);
      expect(result.parameters.contact).toBe(true); // Converted to boolean
    });
  });

  describe('validateType', () => {
    it('should validate string types', () => {
      expect(validator.validateType('test', 'string')).toBe(true);
      expect(validator.validateType(123, 'string')).toBe(false);
    });

    it('should validate number types', () => {
      expect(validator.validateType(123, 'number')).toBe(true);
      expect(validator.validateType('123', 'number')).toBe(true); // String number
      expect(validator.validateType('abc', 'number')).toBe(false);
    });

    it('should validate boolean types', () => {
      expect(validator.validateType(true, 'boolean')).toBe(true);
      expect(validator.validateType('true', 'boolean')).toBe(true);
      expect(validator.validateType('yes', 'boolean')).toBe(true);
      expect(validator.validateType('abc', 'boolean')).toBe(false);
    });

    it('should validate date types', () => {
      expect(validator.validateType(new Date(), 'date')).toBe(true);
      expect(validator.validateType('2023-10-15', 'date')).toBe(true);
      expect(validator.validateType('invalid date', 'date')).toBe(false);
    });

    it('should validate array types', () => {
      expect(validator.validateType([], 'array')).toBe(true);
      expect(validator.validateType([1, 2, 3], 'array')).toBe(true);
      expect(validator.validateType('not an array', 'array')).toBe(false);
    });

    it('should validate object types', () => {
      expect(validator.validateType({}, 'object')).toBe(true);
      expect(validator.validateType({ key: 'value' }, 'object')).toBe(true);
      expect(validator.validateType('not an object', 'object')).toBe(false);
      expect(validator.validateType([], 'object')).toBe(false); // Arrays are not objects
    });

    it('should handle null and undefined values', () => {
      expect(validator.validateType(null, 'string')).toBe(true);
      expect(validator.validateType(undefined, 'number')).toBe(true);
    });
  });

  describe('normalizeParameters', () => {
    it('should normalize parameters based on schema types', () => {
      const params = {
        name: 'A12',
        terminal: 'T1',
        contact: 'yes',
        size: 'large'
      };

      const schema = {
        types: {
          name: 'string',
          terminal: 'string',
          contact: 'boolean',
          size: 'string'
        }
      };

      const normalized = validator.normalizeParameters(params, schema);
      
      expect(normalized.contact).toBe(true); // Converted from 'yes' to true
      expect(normalized.name).toBe('A12'); // Unchanged
    });

    it('should normalize number parameters', () => {
      const params = {
        limit: '10',
        offset: '20'
      };

      const schema = {
        types: {
          limit: 'number',
          offset: 'number'
        }
      };

      const normalized = validator.normalizeParameters(params, schema);
      
      expect(normalized.limit).toBe(10); // Converted to number
      expect(normalized.offset).toBe(20); // Converted to number
    });

    it('should normalize date parameters', () => {
      const params = {
        startDate: '2023-10-15',
        endDate: '2023-10-20'
      };

      const schema = {
        types: {
          startDate: 'date',
          endDate: 'date'
        }
      };

      const normalized = validator.normalizeParameters(params, schema);
      
      // Should convert to ISO format
      expect(normalized.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(normalized.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should normalize array parameters', () => {
      const params = {
        fields: 'name,terminal,type'
      };

      const schema = {
        types: {
          fields: 'array'
        }
      };

      const normalized = validator.normalizeParameters(params, schema);
      
      expect(Array.isArray(normalized.fields)).toBe(true);
      expect(normalized.fields).toEqual(['name', 'terminal', 'type']);
    });
  });
});