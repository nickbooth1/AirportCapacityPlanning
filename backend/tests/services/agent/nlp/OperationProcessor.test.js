/**
 * Tests for OperationProcessor
 */

const OperationProcessor = require('../../../../src/services/agent/nlp/OperationProcessor');

// Mock dependencies
const mockIntentClassifier = {
  classifyIntent: jest.fn()
};

const mockEntityExtractor = {
  extractEntities: jest.fn()
};

const mockParameterValidator = {
  validateParameters: jest.fn()
};

// Set up mocked dependencies
OperationProcessor.intentClassifier = mockIntentClassifier;
OperationProcessor.entityExtractor = mockEntityExtractor;
OperationProcessor.parameterValidator = mockParameterValidator;

describe('OperationProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockIntentClassifier.classifyIntent.mockResolvedValue({
      intent: 'create_stand',
      confidence: 0.85
    });
    
    mockEntityExtractor.extractEntities.mockResolvedValue({
      entities: {
        name: 'A12',
        terminal: 'T1'
      }
    });
    
    mockParameterValidator.validateParameters.mockResolvedValue({
      isValid: true,
      parameters: {
        name: 'A12',
        terminal: 'T1'
      },
      errors: []
    });
  });

  describe('processQuery', () => {
    it('should process a query successfully', async () => {
      const result = await OperationProcessor.processQuery('create a new stand A12 in terminal T1');
      
      expect(result.success).toBe(true);
      expect(result.operationType).toBe('create_stand');
      expect(result.parameters).toEqual({
        name: 'A12',
        terminal: 'T1'
      });
      expect(result.requiresConfirmation).toBe(true);
      
      // Verify all steps were called
      expect(mockIntentClassifier.classifyIntent).toHaveBeenCalled();
      expect(mockEntityExtractor.extractEntities).toHaveBeenCalled();
      expect(mockParameterValidator.validateParameters).toHaveBeenCalled();
    });

    it('should handle intent classification failure', async () => {
      mockIntentClassifier.classifyIntent.mockResolvedValueOnce({
        intent: null,
        confidence: 0.3
      });
      
      const result = await OperationProcessor.processQuery('not a clear operation query');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to determine operation intent');
    });

    it('should handle validation failure', async () => {
      mockParameterValidator.validateParameters.mockResolvedValueOnce({
        isValid: false,
        errors: ['Missing required parameter: terminal']
      });
      
      const result = await OperationProcessor.processQuery('create a new stand A12');
      
      expect(result.success).toBe(false);
      expect(result.validationErrors).toEqual(['Missing required parameter: terminal']);
      expect(result.error).toContain('Parameter validation failed');
    });

    it('should handle processing errors', async () => {
      mockEntityExtractor.extractEntities.mockRejectedValueOnce(new Error('Extraction error'));
      
      const result = await OperationProcessor.processQuery('create a new stand A12 in terminal T1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Processing error');
      expect(result.error).toContain('Extraction error');
    });
  });

  describe('requiresConfirmation', () => {
    it('should require confirmation for create operations', () => {
      expect(OperationProcessor.requiresConfirmation('create_stand')).toBe(true);
      expect(OperationProcessor.requiresConfirmation('create_terminal')).toBe(true);
      expect(OperationProcessor.requiresConfirmation('create_maintenance')).toBe(true);
    });

    it('should require confirmation for update operations', () => {
      expect(OperationProcessor.requiresConfirmation('update_stand')).toBe(true);
      expect(OperationProcessor.requiresConfirmation('update_terminal')).toBe(true);
    });

    it('should require confirmation for delete operations', () => {
      expect(OperationProcessor.requiresConfirmation('delete_stand')).toBe(true);
      expect(OperationProcessor.requiresConfirmation('delete_maintenance')).toBe(true);
    });

    it('should not require confirmation for read operations', () => {
      expect(OperationProcessor.requiresConfirmation('get_stand')).toBe(false);
      expect(OperationProcessor.requiresConfirmation('get_terminal')).toBe(false);
      expect(OperationProcessor.requiresConfirmation('get_maintenance')).toBe(false);
    });
  });

  describe('generateConfirmationMessage', () => {
    it('should generate confirmation for create_stand', () => {
      const operation = {
        operationType: 'create_stand',
        parameters: {
          name: 'A12',
          terminal: 'T1',
          type: 'contact'
        }
      };
      
      const message = OperationProcessor.generateConfirmationMessage(operation);
      expect(message).toContain('Create a new stand named "A12"');
      expect(message).toContain('terminal "T1"');
    });

    it('should generate confirmation for update_terminal', () => {
      const operation = {
        operationType: 'update_terminal',
        parameters: {
          identifier: 'T1',
          name: 'Terminal 1 Updated',
          code: 'T1A'
        }
      };
      
      const message = OperationProcessor.generateConfirmationMessage(operation);
      expect(message).toContain('Update terminal "T1"');
      expect(message).toContain('name: "Terminal 1 Updated"');
      expect(message).toContain('code: "T1A"');
    });

    it('should generate confirmation for delete_maintenance', () => {
      const operation = {
        operationType: 'delete_maintenance',
        parameters: {
          identifier: '12345'
        }
      };
      
      const message = OperationProcessor.generateConfirmationMessage(operation);
      expect(message).toContain('Delete maintenance request "12345"');
    });

    it('should handle unknown operation types', () => {
      const operation = {
        operationType: 'custom_operation',
        parameters: {
          param1: 'value1',
          param2: 'value2'
        }
      };
      
      const message = OperationProcessor.generateConfirmationMessage(operation);
      expect(message).toContain('Confirm custom operation');
      expect(message).toContain('param1');
      expect(message).toContain('value1');
    });
  });

  describe('formatChanges', () => {
    it('should format parameter changes', () => {
      const parameters = {
        identifier: 'A12',
        name: 'A12-Updated',
        terminal: 'T2',
        type: 'remote'
      };
      
      const formatted = OperationProcessor.formatChanges(parameters, ['identifier']);
      expect(formatted).toContain('name: "A12-Updated"');
      expect(formatted).toContain('terminal: "T2"');
      expect(formatted).toContain('type: "remote"');
      expect(formatted).not.toContain('identifier');
    });

    it('should handle empty changes', () => {
      const parameters = {
        identifier: 'A12'
      };
      
      const formatted = OperationProcessor.formatChanges(parameters, ['identifier']);
      expect(formatted).toBe('no changes specified');
    });
  });
});