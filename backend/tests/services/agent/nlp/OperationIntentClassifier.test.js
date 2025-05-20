/**
 * Tests for OperationIntentClassifier
 */

const OperationIntentClassifier = require('../../../../src/services/agent/nlp/OperationIntentClassifier');
const OpenAIService = require('../../../../src/services/agent/OpenAIService');

// Mock OpenAI service
jest.mock('../../../../src/services/agent/OpenAIService', () => ({
  isAvailable: true,
  createChatCompletion: jest.fn()
}));

describe('OperationIntentClassifier', () => {
  let classifier;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new instance for each test
    classifier = new OperationIntentClassifier({
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
    it('should initialize with CRUD operation intent categories', () => {
      expect(classifier.intentCategories.create).toBeDefined();
      expect(classifier.intentCategories.read).toBeDefined();
      expect(classifier.intentCategories.update).toBeDefined();
      expect(classifier.intentCategories.delete).toBeDefined();
      
      // Check that we have intents in each category
      expect(classifier.intentCategories.create.length).toBeGreaterThan(0);
      expect(classifier.intentCategories.read.length).toBeGreaterThan(0);
      expect(classifier.intentCategories.update.length).toBeGreaterThan(0);
      expect(classifier.intentCategories.delete.length).toBeGreaterThan(0);
    });
    
    it('should load operation intent definitions', () => {
      // Check that we have all the expected CRUD intents
      const allIntents = classifier.getAllIntents();
      
      // Check for create intents
      expect(allIntents).toContain('create.stand');
      expect(allIntents).toContain('create.terminal');
      expect(allIntents).toContain('create.maintenance');
      
      // Check for read intents
      expect(allIntents).toContain('get.stand');
      expect(allIntents).toContain('list.stands');
      expect(allIntents).toContain('get.maintenance');
      
      // Check for update intents
      expect(allIntents).toContain('update.stand');
      expect(allIntents).toContain('update.maintenance');
      expect(allIntents).toContain('update.flight');
      
      // Check for delete intents
      expect(allIntents).toContain('delete.stand');
      expect(allIntents).toContain('delete.maintenance');
      expect(allIntents).toContain('delete.flight');
    });
  });
  
  describe('classifyWithRules', () => {
    it('should classify create operations', () => {
      const tests = [
        { 
          text: 'Create a new stand', 
          expected: 'create.stand' 
        },
        { 
          text: 'Add a terminal to the airport', 
          expected: 'create.terminal' 
        },
        { 
          text: 'Schedule maintenance for stand A1', 
          expected: 'create.maintenance' 
        },
        { 
          text: 'Add a new flight for tomorrow', 
          expected: 'create.flight' 
        }
      ];
      
      tests.forEach(test => {
        const result = classifier.classifyWithRules(test.text);
        expect(result).not.toBeNull();
        expect(result.intent).toBe(test.expected);
        expect(result.operation).toBe('create');
      });
    });
    
    it('should classify read operations', () => {
      const tests = [
        { 
          text: 'Show stand A1', 
          expected: 'get.stand' 
        },
        { 
          text: 'List all terminals', 
          expected: 'list.terminals' 
        },
        { 
          text: 'Get details of maintenance request #123', 
          expected: 'get.maintenance' 
        },
        { 
          text: 'View all flights for tomorrow', 
          expected: 'list.flights' 
        }
      ];
      
      tests.forEach(test => {
        const result = classifier.classifyWithRules(test.text);
        expect(result).not.toBeNull();
        expect(result.intent).toBe(test.expected);
        expect(result.operation).toBe('read');
      });
    });
    
    it('should classify update operations', () => {
      const tests = [
        { 
          text: 'Update stand A1', 
          expected: 'update.stand' 
        },
        { 
          text: 'Change the maintenance schedule', 
          expected: 'update.maintenance' 
        },
        { 
          text: 'Edit flight AA123 details', 
          expected: 'update.flight' 
        },
        { 
          text: 'Modify the allocation for tomorrow', 
          expected: 'update.allocation' 
        }
      ];
      
      tests.forEach(test => {
        const result = classifier.classifyWithRules(test.text);
        expect(result).not.toBeNull();
        expect(result.intent).toBe(test.expected);
        expect(result.operation).toBe('update');
      });
    });
    
    it('should classify delete operations', () => {
      const tests = [
        { 
          text: 'Delete stand A1', 
          expected: 'delete.stand' 
        },
        { 
          text: 'Cancel maintenance request #123', 
          expected: 'delete.maintenance' 
        },
        { 
          text: 'Remove flight AA123 from the schedule', 
          expected: 'delete.flight' 
        },
        { 
          text: 'Clear the allocation for tomorrow', 
          expected: 'delete.allocation' 
        }
      ];
      
      tests.forEach(test => {
        const result = classifier.classifyWithRules(test.text);
        expect(result).not.toBeNull();
        expect(result.intent).toBe(test.expected);
        expect(result.operation).toBe('delete');
      });
    });
    
    it('should handle non-CRUD intents by deferring to base classifier', () => {
      // This test depends on the behavior of the base IntentClassifier
      // We're checking that non-CRUD intents are still handled by the parent class
      const result = classifier.classifyWithRules('What is the status of stand A1?');
      
      // The base classifier should match this as 'stand.status' or similar
      expect(result).not.toBeNull();
      expect(result.intent).not.toContain('create');
      expect(result.intent).not.toContain('update');
      expect(result.intent).not.toContain('delete');
    });
  });
  
  describe('getOperationType', () => {
    it('should return the correct operation type for each intent', () => {
      // Create intents
      expect(classifier.getOperationType('create.stand')).toBe('create');
      expect(classifier.getOperationType('add.terminal')).toBe('create');
      expect(classifier.getOperationType('schedule.maintenance')).toBe('create');
      
      // Read intents
      expect(classifier.getOperationType('get.stand')).toBe('read');
      expect(classifier.getOperationType('view.terminal')).toBe('read');
      expect(classifier.getOperationType('list.stands')).toBe('read');
      
      // Update intents
      expect(classifier.getOperationType('update.stand')).toBe('update');
      expect(classifier.getOperationType('edit.flight')).toBe('update');
      expect(classifier.getOperationType('modify.maintenance')).toBe('update');
      
      // Delete intents
      expect(classifier.getOperationType('delete.stand')).toBe('delete');
      expect(classifier.getOperationType('remove.flight')).toBe('delete');
      expect(classifier.getOperationType('cancel.maintenance')).toBe('delete');
      
      // Non-CRUD intents
      expect(classifier.getOperationType('stand.status')).toBeNull();
      expect(classifier.getOperationType('airport.info')).toBeNull();
    });
  });
  
  describe('getEntityType', () => {
    it('should return the correct entity type for each intent', () => {
      // Regular intents
      expect(classifier.getEntityType('create.stand')).toBe('stand');
      expect(classifier.getEntityType('get.terminal')).toBe('terminal');
      expect(classifier.getEntityType('update.flight')).toBe('flight');
      expect(classifier.getEntityType('delete.maintenance')).toBe('maintenance');
      
      // List intents
      expect(classifier.getEntityType('list.stands')).toBe('stand');
      expect(classifier.getEntityType('list.terminals')).toBe('terminal');
      expect(classifier.getEntityType('list.flights')).toBe('flight');
    });
  });
  
  describe('isList', () => {
    it('should correctly identify list intents', () => {
      // List intents
      expect(classifier.isList('list.stands')).toBe(true);
      expect(classifier.isList('list.terminals')).toBe(true);
      expect(classifier.isList('list.flights')).toBe(true);
      
      // Get intents with plural
      expect(classifier.isList('get.stands')).toBe(true);
      
      // Non-list intents
      expect(classifier.isList('get.stand')).toBe(false);
      expect(classifier.isList('create.terminal')).toBe(false);
      expect(classifier.isList('update.flight')).toBe(false);
      expect(classifier.isList('delete.maintenance')).toBe(false);
    });
  });
  
  describe('process', () => {
    it('should enhance classification results with CRUD metadata', async () => {
      // Mock the OpenAI response for a create intent
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{intent: "create.stand", confidence: 0.95}'
            }
          }
        ]
      });
      
      const result = await classifier.process('Create a new stand A15 in Terminal 1');
      
      expect(result.success).toBe(true);
      expect(result.data.intent).toBe('create.stand');
      expect(result.data.operationType).toBe('create');
      expect(result.data.entityType).toBe('stand');
      expect(result.data.isList).toBe(false);
      expect(result.data.requiresConfirmation).toBe(true);
    });
    
    it('should identify read operations that do not require confirmation', async () => {
      // Mock the OpenAI response for a read intent
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{intent: "list.stands", confidence: 0.92}'
            }
          }
        ]
      });
      
      const result = await classifier.process('Show me all stands in Terminal 1');
      
      expect(result.success).toBe(true);
      expect(result.data.intent).toBe('list.stands');
      expect(result.data.operationType).toBe('read');
      expect(result.data.entityType).toBe('stand');
      expect(result.data.isList).toBe(true);
      expect(result.data.requiresConfirmation).toBe(false);
    });
    
    it('should identify operations that require confirmation', async () => {
      // Test for create operation
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{intent: "create.flight", confidence: 0.90}'
            }
          }
        ]
      });
      
      let result = await classifier.process('Add a new flight AA123');
      expect(result.data.requiresConfirmation).toBe(true);
      
      // Test for update operation
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{intent: "update.maintenance", confidence: 0.88}'
            }
          }
        ]
      });
      
      result = await classifier.process('Change the maintenance schedule for stand A1');
      expect(result.data.requiresConfirmation).toBe(true);
      
      // Test for delete operation
      OpenAIService.createChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{intent: "delete.stand", confidence: 0.95}'
            }
          }
        ]
      });
      
      result = await classifier.process('Remove stand A1 from the system');
      expect(result.data.requiresConfirmation).toBe(true);
    });
    
    it('should handle rule-based classification for operations', async () => {
      // No need to mock OpenAI here since rule-based classification comes first
      
      const result = await classifier.process('Delete stand A1');
      
      expect(result.success).toBe(true);
      expect(result.data.intent).toBe('delete.stand');
      expect(result.data.method).toBe('rules');
      expect(result.data.operationType).toBe('delete');
      expect(result.data.entityType).toBe('stand');
      expect(result.data.requiresConfirmation).toBe(true);
    });
  });
});