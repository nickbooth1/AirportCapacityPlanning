/**
 * Integration tests for the ContextService and conversation context management
 */

const contextService = require('../../../src/services/agent/ContextService');
const ConversationContext = require('../../../src/models/agent/ConversationContext');
const LongTermMemory = require('../../../src/models/agent/LongTermMemory');
const knex = require('../../../src/utils/db');

describe('ContextService Integration Tests', () => {
  // Clean up test data before and after tests
  beforeAll(async () => {
    // Ensure test tables exist
    const contextTableExists = await knex.schema.hasTable('conversation_contexts');
    const memoryTableExists = await knex.schema.hasTable('agent_long_term_memories');
    
    if (!contextTableExists || !memoryTableExists) {
      throw new Error('Required tables do not exist. Please run migrations first.');
    }
    
    // Clean up any existing test data
    await LongTermMemory.query().delete().where('user_id', 'test-user');
    await ConversationContext.query().delete().where('userId', 'test-user');
  });
  
  afterAll(async () => {
    // Clean up test data
    await LongTermMemory.query().delete().where('user_id', 'test-user');
    await ConversationContext.query().delete().where('userId', 'test-user');
    
    // Close database connection
    await knex.destroy();
  });
  
  // Reset the context service metrics between tests
  beforeEach(() => {
    contextService.resetMetrics();
  });
  
  it('should create a new conversation context', async () => {
    const context = await contextService.createContext('test-user');
    
    expect(context).toBeDefined();
    expect(context.id).toBeDefined();
    expect(context.userId).toBe('test-user');
    expect(context.messages).toEqual([]);
    expect(context.entities).toEqual({});
    expect(context.intents).toEqual([]);
  });
  
  it('should add user and agent messages to context', async () => {
    // Create a new context
    const context = await contextService.createContext('test-user');
    
    // Add a user message
    await contextService.addUserMessage(context.id, 'What is the capacity for Terminal 1?');
    
    // Retrieve the updated context
    const updatedContext = await contextService.getContext(context.id, true);
    
    // Verify user message was added
    expect(updatedContext.messages.length).toBe(1);
    expect(updatedContext.messages[0].role).toBe('user');
    expect(updatedContext.messages[0].content).toBe('What is the capacity for Terminal 1?');
    
    // Add an agent message
    await contextService.addAgentMessage(context.id, 'Terminal 1 has a capacity of 120 aircraft per day.');
    
    // Retrieve the updated context again
    const finalContext = await contextService.getContext(context.id, true);
    
    // Verify agent message was added
    expect(finalContext.messages.length).toBe(2);
    expect(finalContext.messages[1].role).toBe('agent');
    expect(finalContext.messages[1].content).toBe('Terminal 1 has a capacity of 120 aircraft per day.');
  });
  
  it('should update entities in the context', async () => {
    // Create a new context
    const context = await contextService.createContext('test-user');
    
    // Add entities
    const entities = {
      terminal: 'Terminal 1',
      aircraft_type: 'A320'
    };
    
    await contextService.updateEntities(context.id, entities);
    
    // Retrieve the updated context
    const updatedContext = await contextService.getContext(context.id, true);
    
    // Verify entities were added
    expect(updatedContext.entities).toEqual(entities);
    
    // Update with additional entities
    const additionalEntities = {
      time_period: 'morning',
      date: '2025-06-15'
    };
    
    await contextService.updateEntities(context.id, additionalEntities);
    
    // Retrieve the context again
    const finalContext = await contextService.getContext(context.id, true);
    
    // Verify entities were merged
    expect(finalContext.entities).toEqual({
      ...entities,
      ...additionalEntities
    });
  });
  
  it('should add intents to the context', async () => {
    // Create a new context
    const context = await contextService.createContext('test-user');
    
    // Add an intent
    await contextService.addIntent(context.id, 'capacity_query', 0.92);
    
    // Retrieve the updated context
    const updatedContext = await contextService.getContext(context.id, true);
    
    // Verify intent was added
    expect(updatedContext.intents.length).toBe(1);
    expect(updatedContext.intents[0].type).toBe('capacity_query');
    expect(updatedContext.intents[0].confidence).toBe(0.92);
  });
  
  it('should retrieve conversation history', async () => {
    // Create a new context
    const context = await contextService.createContext('test-user');
    
    // Add some messages
    await contextService.addUserMessage(context.id, 'What is the capacity for Terminal 1?');
    await contextService.addAgentMessage(context.id, 'Terminal 1 has a capacity of 120 aircraft per day.');
    await contextService.addUserMessage(context.id, 'And what about Terminal 2?');
    await contextService.addAgentMessage(context.id, 'Terminal 2 has a capacity of 85 aircraft per day.');
    
    // Get the conversation history
    const history = await contextService.getConversationHistory(context.id);
    
    // Verify history
    expect(history.length).toBe(4);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('What is the capacity for Terminal 1?');
    expect(history[1].role).toBe('agent');
    expect(history[1].content).toBe('Terminal 1 has a capacity of 120 aircraft per day.');
    expect(history[2].role).toBe('user');
    expect(history[2].content).toBe('And what about Terminal 2?');
    expect(history[3].role).toBe('agent');
    expect(history[3].content).toBe('Terminal 2 has a capacity of 85 aircraft per day.');
  });
});