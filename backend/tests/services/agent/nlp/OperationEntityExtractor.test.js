/**
 * Tests for OperationEntityExtractor
 */

const OperationEntityExtractor = require('../../../../src/services/agent/nlp/OperationEntityExtractor');
const OpenAIService = require('../../../../src/services/agent/OpenAIService');

// Mock OpenAI service
jest.mock('../../../../src/services/agent/OpenAIService', () => ({
  isAvailable: true,
  createChatCompletion: jest.fn()
}));

describe('OperationEntityExtractor', () => {
  let extractor;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new instance for each test
    extractor = new OperationEntityExtractor({
      openAIService: OpenAIService,
      logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    });
  });
  
  describe('initialization', () => {
    it('should initialize with operation-specific entity types', () => {
      // Check for base entity types
      expect(extractor.entityTypes.stand).toBeDefined();
      expect(extractor.entityTypes.terminal).toBeDefined();
      expect(extractor.entityTypes.date).toBeDefined();
      
      // Check for operation-specific entity types
      expect(extractor.entityTypes.name).toBeDefined();
      expect(extractor.entityTypes.code).toBeDefined();
      expect(extractor.entityTypes.location).toBeDefined();
      expect(extractor.entityTypes.type).toBeDefined();
      expect(extractor.entityTypes.capacity).toBeDefined();
      expect(extractor.entityTypes.status).toBeDefined();
      expect(extractor.entityTypes.priority).toBeDefined();
      expect(extractor.entityTypes.description).toBeDefined();
      expect(extractor.entityTypes.reason).toBeDefined();
      expect(extractor.entityTypes.features).toBeDefined();
      
      // Check for operation parameter entity types
      expect(extractor.entityTypes.id).toBeDefined();
      expect(extractor.entityTypes.startDate).toBeDefined();
      expect(extractor.entityTypes.endDate).toBeDefined();
      expect(extractor.entityTypes.flightNumber).toBeDefined();
      expect(extractor.entityTypes.standId).toBeDefined();
      expect(extractor.entityTypes.sortBy).toBeDefined();
      expect(extractor.entityTypes.orderDirection).toBeDefined();
      expect(extractor.entityTypes.filterBy).toBeDefined();
    });
  });
  
  describe('extraction for create operations', () => {
    it('should extract create stand parameters', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Create a new remote stand with name A15 in Terminal 1 with capacity of 30', 
        { 
          intent: 'create.stand',
          operationType: 'create',
          entityType: 'stand'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('A15');
      expect(result.data.terminal).toBe('T1');
      expect(result.data.type).toBe('remote');
      expect(result.data.capacity).toBe(30);
      
      // Check parameter completeness
      expect(result.metadata.parameterStatus.isComplete).toBe(true);
    });
    
    it('should extract create maintenance parameters', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Schedule maintenance for stand A1 from tomorrow until next Friday due to surface repairs with high priority', 
        { 
          intent: 'create.maintenance',
          operationType: 'create',
          entityType: 'maintenance'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.standId).toBe('A1');
      expect(result.data.startDate).toBeDefined();
      expect(result.data.endDate).toBeDefined();
      expect(result.data.reason).toBe('surface repairs');
      expect(result.data.priority).toBe('high');
      
      // Check parameter completeness
      expect(result.metadata.parameterStatus.isComplete).toBe(true);
    });
    
    it('should extract JSON-like attributes', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Create a new stand with name A16 in Terminal 2 with contactGate=true hasJetway=true maxWingspan=50', 
        { 
          intent: 'create.stand',
          operationType: 'create',
          entityType: 'stand'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('A16');
      expect(result.data.terminal).toBe('T2');
      expect(result.data.attributes).toBeDefined();
      expect(result.data.attributes.contactgate).toBe(true);
      expect(result.data.attributes.hasjetway).toBe(true);
      expect(result.data.attributes.maxwingspan).toBe(50);
    });
  });
  
  describe('extraction for read operations', () => {
    it('should extract parameters for reading a single entity', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Show stand A1 details in detailed format', 
        { 
          intent: 'get.stand',
          operationType: 'read',
          entityType: 'stand'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('A1');
      expect(result.data.format).toBe('detailed');
      
      // Check parameter completeness - read operations don't have required params
      expect(result.metadata.parameterStatus.isComplete).toBe(true);
    });
    
    it('should extract parameters for listing entities', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'List all stands in Terminal 1 sorted by capacity in descending order', 
        { 
          intent: 'list.stands',
          operationType: 'read',
          entityType: 'stand'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.terminal).toBe('T1');
      expect(result.data.sortBy).toBe('capacity');
      expect(result.data.orderDirection).toBe('desc');
      expect(result.data.format).toBe('summary'); // Default for lists
      
      // Check parameter completeness
      expect(result.metadata.parameterStatus.isComplete).toBe(true);
    });
    
    it('should extract filterBy parameters', async () => {
      // Mock AI extraction to return filterBy entity
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{"filterBy": {"field": "status", "value": "available"}}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Show all stands where status is available', 
        { 
          intent: 'list.stands',
          operationType: 'read',
          entityType: 'stand'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.filters).toBeDefined();
      expect(result.data.filters[0].field).toBe('status');
      expect(result.data.filters[0].value).toBe('available');
    });
  });
  
  describe('extraction for update operations', () => {
    it('should extract parameters for updating an entity', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Update stand A1 with capacity=35 and type=contact', 
        { 
          intent: 'update.stand',
          operationType: 'update',
          entityType: 'stand'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('A1');
      expect(result.data.fieldsToUpdate).toBeDefined();
      expect(result.data.fieldsToUpdate.capacity).toBe(35);
      expect(result.data.fieldsToUpdate.type).toBe('contact');
      
      // Check parameter completeness
      expect(result.metadata.parameterStatus.isComplete).toBe(true);
    });
    
    it('should extract maintenance update parameters', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Update maintenance request #123 with end date next Monday and change priority to low', 
        { 
          intent: 'update.maintenance',
          operationType: 'update',
          entityType: 'maintenance'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('123');
      expect(result.data.fieldsToUpdate).toBeDefined();
      expect(result.data.fieldsToUpdate.endDate).toBeDefined();
      expect(result.data.fieldsToUpdate.priority).toBe('low');
      
      // Check parameter completeness
      expect(result.metadata.parameterStatus.isComplete).toBe(true);
    });
    
    it('should mark as incomplete if required parameters are missing', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Update the stand with type=remote', 
        { 
          intent: 'update.stand',
          operationType: 'update',
          entityType: 'stand'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.fieldsToUpdate).toBeDefined();
      expect(result.data.fieldsToUpdate.type).toBe('remote');
      expect(result.data.id).toBeUndefined();
      
      // Check parameter completeness - should be incomplete due to missing id
      expect(result.metadata.parameterStatus.isComplete).toBe(false);
      expect(result.metadata.parameterStatus.missingParams).toContain('id');
    });
  });
  
  describe('extraction for delete operations', () => {
    it('should extract parameters for deleting an entity', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Delete stand A1 due to renovation', 
        { 
          intent: 'delete.stand',
          operationType: 'delete',
          entityType: 'stand'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('A1');
      expect(result.data.reason).toBe('renovation');
      
      // Check parameter completeness
      expect(result.metadata.parameterStatus.isComplete).toBe(true);
    });
    
    it('should extract soft delete and cascade flags', async () => {
      // Mock AI extraction to return no additional entities
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{}'
            }
          }
        ]
      });
      
      const result = await extractor.process(
        'Soft delete terminal T1 and all associated stands', 
        { 
          intent: 'delete.terminal',
          operationType: 'delete',
          entityType: 'terminal'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('T1');
      expect(result.data.softDelete).toBe(true);
      expect(result.data.cascade).toBe(true);
      
      // Check parameter completeness
      expect(result.metadata.parameterStatus.isComplete).toBe(true);
    });
  });
  
  describe('extractJSONAttributes', () => {
    it('should extract attribute-value pairs with different formats', async () => {
      // Test the private method directly
      const text1 = 'Create a stand with name=A1 capacity=30 type="remote" isActive=true';
      const attributes1 = extractor._extractJSONAttributes(text1);
      
      expect(attributes1.name).toBe('A1');
      expect(attributes1.capacity).toBe(30);
      expect(attributes1.type).toBe('remote');
      expect(attributes1.isactive).toBe(true);
      
      const text2 = 'Add a stand with name of A2 and capacity of 25 and with type set to contact';
      const attributes2 = extractor._extractJSONAttributes(text2);
      
      expect(attributes2.name).toBe('A2');
      expect(attributes2.capacity).toBe(25);
      expect(attributes2.type).toBe('contact');
      
      const text3 = 'Create a stand with config={"jetway": true, "maxWingspan": 50}';
      const attributes3 = extractor._extractJSONAttributes(text3);
      
      expect(attributes3.config).toBe('{"jetway": true, "maxWingspan": 50}');
      expect(attributes3.jetway).toBe(true);
      expect(attributes3.maxwingspan).toBe(50);
    });
  });
  
  describe('inferOperationType', () => {
    it('should infer operation type from intent', () => {
      // Test the private method directly
      expect(extractor._inferOperationType('create.stand')).toBe('create');
      expect(extractor._inferOperationType('add.flight')).toBe('create');
      
      expect(extractor._inferOperationType('get.stand')).toBe('read');
      expect(extractor._inferOperationType('list.flights')).toBe('read');
      expect(extractor._inferOperationType('view.terminal')).toBe('read');
      expect(extractor._inferOperationType('show.maintenance')).toBe('read');
      
      expect(extractor._inferOperationType('update.stand')).toBe('update');
      expect(extractor._inferOperationType('edit.flight')).toBe('update');
      expect(extractor._inferOperationType('modify.terminal')).toBe('update');
      expect(extractor._inferOperationType('change.maintenance')).toBe('update');
      
      expect(extractor._inferOperationType('delete.stand')).toBe('delete');
      expect(extractor._inferOperationType('remove.flight')).toBe('delete');
      expect(extractor._inferOperationType('cancel.maintenance')).toBe('delete');
      expect(extractor._inferOperationType('clear.allocation')).toBe('delete');
      
      // Non-operation intents
      expect(extractor._inferOperationType('stand.status')).toBeNull();
      expect(extractor._inferOperationType('airport.info')).toBeNull();
    });
  });
  
  describe('checkParameterCompleteness', () => {
    it('should correctly identify complete and incomplete parameters', () => {
      // Test create stand with complete parameters
      const completeCreateStand = extractor._checkParameterCompleteness(
        { name: 'A1', terminal: 'T1' },
        'create',
        'stand'
      );
      
      expect(completeCreateStand.isComplete).toBe(true);
      expect(completeCreateStand.missingParams).toHaveLength(0);
      
      // Test create stand with incomplete parameters
      const incompleteCreateStand = extractor._checkParameterCompleteness(
        { name: 'A1' },
        'create',
        'stand'
      );
      
      expect(incompleteCreateStand.isComplete).toBe(false);
      expect(incompleteCreateStand.missingParams).toContain('terminal');
      
      // Test update with complete parameters
      const completeUpdate = extractor._checkParameterCompleteness(
        { id: '123', fieldsToUpdate: { capacity: 30 } },
        'update',
        'stand'
      );
      
      expect(completeUpdate.isComplete).toBe(true);
      
      // Test update with incomplete parameters
      const incompleteUpdate = extractor._checkParameterCompleteness(
        { id: '123', fieldsToUpdate: {} },
        'update',
        'stand'
      );
      
      expect(incompleteUpdate.isComplete).toBe(false);
      expect(incompleteUpdate.missingParams).toContain('fieldsToUpdate');
    });
  });
});