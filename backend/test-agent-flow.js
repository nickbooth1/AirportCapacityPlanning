/**
 * Script to test the complete agent flow with the StubNLPService and updated database schema
 */

// Import all necessary modules
const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');
const agentService = require('./src/services/agent/AgentService');
const contextService = require('./src/services/agent/ContextService');
const nlpService = require('./src/services/agent/StubNLPService');

async function testCompleteAgentFlow() {
  try {
    logger.info('Testing complete agent flow with StubNLPService and updated database schema...');
    
    // Step 1: Set up database
    await setupDatabase();
    
    // Step 2: Process a user query
    const userId = 'test-user';
    const query = "What's the current capacity of Terminal 1 for A380 aircraft?";
    
    logger.info(`Processing query: "${query}" for user: ${userId}`);
    const result = await agentService.processQuery(query, userId);
    
    logger.info('Query processing result:', result);
    
    // Step 3: Create an action proposal
    const contextId = result.contextId;
    
    // Create a new query for an action that requires approval
    const actionQuery = "Schedule maintenance for Stand A12 tomorrow";
    
    logger.info(`Processing action query: "${actionQuery}" for user: ${userId} in context: ${contextId}`);
    const actionResult = await agentService.processQuery(actionQuery, userId, contextId);
    
    logger.info('Action query processing result:', actionResult);
    
    // Step 4: Approve the action proposal
    if (actionResult.requiresApproval && actionResult.proposalId) {
      logger.info(`Approving action proposal: ${actionResult.proposalId}`);
      const approvalResult = await agentService.processApproval(actionResult.proposalId, userId);
      
      logger.info('Action approval result:', approvalResult);
    }
    
    // Step 5: Save an insight
    const insightResult = await agentService.saveInsight(
      result.response.id,
      userId,
      'Terminal 1 A380 Capacity',
      'CAPACITY',
      'Important information about Terminal 1 capacity for planning'
    );
    
    logger.info('Insight saving result:', insightResult);
    
    // Step 6: Get insights
    const insights = await agentService.getInsights(userId);
    
    logger.info('Retrieved insights:', insights);
    
    // Step 7: Provide feedback
    const feedbackResult = await agentService.processFeedback(
      result.response.id,
      5,
      'Very helpful information'
    );
    
    logger.info('Feedback processing result:', feedbackResult);
    
    // Step 8: Get conversation history
    const context = await contextService.getContext(contextId);
    
    logger.info('Conversation context:', context);
    
    // Success!
    logger.info('All tests completed successfully!');
    return true;
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    throw error;
  } finally {
    // Clean up
    await cleanupDatabase();
    
    // Close database connection
    await knex.destroy();
  }
}

/**
 * Set up the database for testing
 */
async function setupDatabase() {
  logger.info('Setting up database...');
  
  // Check if tables already exist
  const contextsExist = await knex.schema.hasTable('conversation_contexts');
  const queriesExist = await knex.schema.hasTable('agent_queries');
  const responsesExist = await knex.schema.hasTable('agent_responses');
  const proposalsExist = await knex.schema.hasTable('action_proposals');
  const insightsExist = await knex.schema.hasTable('agent_insights');
  
  // Drop existing tables
  if (insightsExist) {
    await knex.schema.dropTable('agent_insights');
    logger.info('Dropped existing agent_insights table');
  }
  
  if (proposalsExist) {
    await knex.schema.dropTable('action_proposals');
    logger.info('Dropped existing action_proposals table');
  }
  
  if (responsesExist) {
    await knex.schema.dropTable('agent_responses');
    logger.info('Dropped existing agent_responses table');
  }
  
  if (queriesExist) {
    await knex.schema.dropTable('agent_queries');
    logger.info('Dropped existing agent_queries table');
  }
  
  if (contextsExist) {
    await knex.schema.dropTable('conversation_contexts');
    logger.info('Dropped existing conversation_contexts table');
  }
  
  // Create the tables
  
  // 1. Create conversation_contexts table
  await knex.schema.createTable('conversation_contexts', table => {
    table.uuid('id').primary().notNullable();
    table.string('userId').notNullable().index();
    table.timestamp('startTime').notNullable().defaultTo(knex.fn.now());
    table.timestamp('lastUpdateTime').notNullable().defaultTo(knex.fn.now());
    table.timestamp('endTime').nullable();
    table.jsonb('messages').defaultTo('[]');
    table.jsonb('entities').defaultTo('{}');
    table.jsonb('intents').defaultTo('[]');
    table.text('summary').nullable();
    table.float('contextQuality').defaultTo(1.0);
    table.jsonb('topicTags').defaultTo(JSON.stringify([]));
  });
  logger.info('Created conversation_contexts table');
  
  // 2. Create agent_queries table
  await knex.schema.createTable('agent_queries', table => {
    table.uuid('id').primary().notNullable();
    table.text('text').notNullable();
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    table.uuid('contextId').notNullable();
    table.string('parsedIntent').nullable();
    table.float('confidence').nullable();
    table.jsonb('entities').notNullable().defaultTo(JSON.stringify({}));
    table.jsonb('processing').notNullable().defaultTo(JSON.stringify({
      startTime: new Date().toISOString(),
      status: 'pending',
      error: null
    }));
    table.index(['contextId']);
  });
  logger.info('Created agent_queries table');
  
  // 3. Create agent_responses table
  await knex.schema.createTable('agent_responses', table => {
    table.uuid('id').primary().notNullable();
    table.uuid('queryId').notNullable();
    table.uuid('contextId').notNullable();
    table.text('text').notNullable();
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    table.jsonb('visualizations').notNullable().defaultTo(JSON.stringify([]));
    table.jsonb('rawData').notNullable().defaultTo(JSON.stringify({}));
    table.integer('feedbackRating').nullable();
    table.text('feedbackComment').nullable();
    table.index(['contextId']);
    table.index(['queryId']);
  });
  logger.info('Created agent_responses table');
  
  // 4. Create action_proposals table
  await knex.schema.createTable('action_proposals', table => {
    table.uuid('id').primary().notNullable();
    table.uuid('contextId').notNullable();
    table.string('userId').notNullable();
    table.string('actionType').notNullable();
    table.text('description').notNullable();
    table.jsonb('parameters').notNullable().defaultTo(JSON.stringify({}));
    table.text('impact').nullable();
    table.string('status').notNullable().defaultTo('pending');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expiresAt').notNullable().defaultTo(knex.raw('NOW() + interval \'1 day\'')); 
    table.timestamp('approvedAt').nullable();
    table.timestamp('rejectedAt').nullable();
    table.timestamp('executedAt').nullable();
    table.text('reason').nullable();
    table.jsonb('result').nullable();
    table.index(['contextId']);
    table.index(['userId']);
    table.index(['status']);
  });
  logger.info('Created action_proposals table');
  
  // 5. Create agent_insights table
  await knex.schema.createTable('agent_insights', table => {
    table.uuid('id').primary().notNullable();
    table.uuid('responseId').notNullable();
    table.string('userId').notNullable();
    table.string('title').notNullable();
    table.string('category').notNullable();
    table.text('notes').nullable();
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());
    table.boolean('isArchived').notNullable().defaultTo(false);
    table.jsonb('tags').defaultTo(JSON.stringify([]));
    table.index(['userId']);
    table.index(['responseId']);
    table.index(['category']);
  });
  logger.info('Created agent_insights table');
  
  logger.info('Database setup complete');
}

/**
 * Clean up the database after testing
 */
async function cleanupDatabase() {
  logger.info('Cleaning up database...');
  
  try {
    await knex.schema.dropTableIfExists('agent_insights');
    await knex.schema.dropTableIfExists('action_proposals');
    await knex.schema.dropTableIfExists('agent_responses');
    await knex.schema.dropTableIfExists('agent_queries');
    await knex.schema.dropTableIfExists('conversation_contexts');
    logger.info('Test tables dropped successfully');
  } catch (cleanupError) {
    logger.warn(`Cleanup failed: ${cleanupError.message}`);
  }
}

// Run the tests
testCompleteAgentFlow()
  .then(() => {
    console.log('Agent flow tests completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });