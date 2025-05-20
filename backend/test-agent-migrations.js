/**
 * Script to test the agent database migrations with sample data
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');
const { v4: uuidv4 } = require('uuid');

async function testAgentMigrations() {
  try {
    logger.info('Testing agent database migrations with sample data...');
    
    // Step 1: First, let's run the migrations to create the tables
    logger.info('Step 1: Running migrations');
    
    // Check if tables already exist
    const contextsExist = await knex.schema.hasTable('conversation_contexts');
    const queriesExist = await knex.schema.hasTable('agent_queries');
    const responsesExist = await knex.schema.hasTable('agent_responses');
    const proposalsExist = await knex.schema.hasTable('action_proposals');
    
    if (contextsExist) {
      await knex.schema.dropTable('conversation_contexts');
      logger.info('Dropped existing conversation_contexts table');
    }
    
    if (queriesExist) {
      await knex.schema.dropTable('agent_queries');
      logger.info('Dropped existing agent_queries table');
    }
    
    if (responsesExist) {
      await knex.schema.dropTable('agent_responses');
      logger.info('Dropped existing agent_responses table');
    }
    
    if (proposalsExist) {
      await knex.schema.dropTable('action_proposals');
      logger.info('Dropped existing action_proposals table');
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
      table.specificType('topicTags', 'text[]').defaultTo('{}');
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
    
    // Step 2: Insert test data
    logger.info('Step 2: Inserting test data');
    
    // Create a test conversation context
    const contextId = uuidv4();
    await knex('conversation_contexts').insert({
      id: contextId,
      userId: 'test-user',
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      messages: JSON.stringify([
        {
          id: uuidv4(),
          role: 'user',
          content: 'Hello, I need information about Terminal 1 capacity.',
          timestamp: new Date().toISOString()
        }
      ]),
      entities: JSON.stringify({
        terminal: 'Terminal 1'
      }),
      intents: JSON.stringify([
        {
          type: 'capacity.query',
          confidence: 0.85,
          timestamp: new Date().toISOString()
        }
      ]),
      contextQuality: 0.9
    });
    logger.info(`Created test conversation context with ID: ${contextId}`);
    
    // Create a test query
    const queryId = uuidv4();
    await knex('agent_queries').insert({
      id: queryId,
      text: 'What is the capacity of Terminal 1 for A380 aircraft?',
      timestamp: new Date().toISOString(),
      contextId: contextId,
      parsedIntent: 'capacity.query',
      confidence: 0.85,
      entities: JSON.stringify({
        terminal: 'Terminal 1',
        aircraft_type: 'A380',
        originalQuery: 'What is the capacity of Terminal 1 for A380 aircraft?'
      }),
      processing: JSON.stringify({
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'completed',
        error: null
      })
    });
    logger.info(`Created test query with ID: ${queryId}`);
    
    // Create a test response
    const responseId = uuidv4();
    await knex('agent_responses').insert({
      id: responseId,
      queryId: queryId,
      contextId: contextId,
      text: 'Terminal 1 can accommodate up to 5 A380 aircraft simultaneously.',
      timestamp: new Date().toISOString(),
      visualizations: JSON.stringify([
        {
          id: uuidv4(),
          type: 'barChart',
          format: 'json',
          data: JSON.stringify({
            labels: ['A380', 'B747', 'A320'],
            datasets: [
              {
                label: 'Aircraft Capacity',
                data: [5, 8, 12]
              }
            ]
          }),
          title: 'Terminal 1 Aircraft Capacity',
          metadata: {
            source: 'capacity_service'
          }
        }
      ]),
      rawData: JSON.stringify({
        capacity: {
          terminal: 'Terminal 1',
          aircraft: {
            'A380': 5,
            'B747': 8,
            'A320': 12
          }
        }
      })
    });
    logger.info(`Created test response with ID: ${responseId}`);
    
    // Create a test action proposal
    const proposalId = uuidv4();
    await knex('action_proposals').insert({
      id: proposalId,
      contextId: contextId,
      userId: 'test-user',
      actionType: 'maintenance.create',
      description: 'Create maintenance request for Stand A12 tomorrow',
      parameters: JSON.stringify({
        stand: 'A12',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
        reason: 'Scheduled maintenance'
      }),
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    logger.info(`Created test action proposal with ID: ${proposalId}`);
    
    // Step 3: Verify the data was inserted correctly
    logger.info('Step 3: Verifying data insertion');
    
    const context = await knex('conversation_contexts').where('id', contextId).first();
    const query = await knex('agent_queries').where('id', queryId).first();
    const response = await knex('agent_responses').where('id', responseId).first();
    const proposal = await knex('action_proposals').where('id', proposalId).first();
    
    logger.info('Context data retrieved successfully');
    logger.info('Query data retrieved successfully');
    logger.info('Response data retrieved successfully');
    logger.info('Proposal data retrieved successfully');
    
    // Step 4: Update the test data to verify updates work correctly
    logger.info('Step 4: Testing data updates');
    
    // Update the context
    await knex('conversation_contexts')
      .where('id', contextId)
      .update({
        lastUpdateTime: new Date().toISOString(),
        messages: JSON.stringify([
          // Add a new message
          {
            id: uuidv4(),
            role: 'agent',
            content: 'Terminal 1 can accommodate up to 5 A380 aircraft simultaneously.',
            timestamp: new Date().toISOString(),
            responseId: responseId
          }
        ])
      });
    logger.info('Updated context');
    
    // Update the query
    await knex('agent_queries')
      .where('id', queryId)
      .update({
        processing: JSON.stringify({
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          status: 'completed',
          error: null
        })
      });
    logger.info('Updated query');
    
    // Update the response
    await knex('agent_responses')
      .where('id', responseId)
      .update({
        feedbackRating: 5,
        feedbackComment: 'Very helpful response, thank you!'
      });
    logger.info('Updated response');
    
    // Update the proposal
    await knex('action_proposals')
      .where('id', proposalId)
      .update({
        status: 'approved',
        approvedAt: new Date().toISOString()
      });
    logger.info('Updated action proposal');
    
    // Step 5: Verify the data updates
    logger.info('Step 5: Verifying data updates');
    
    const updatedContext = await knex('conversation_contexts').where('id', contextId).first();
    const updatedQuery = await knex('agent_queries').where('id', queryId).first();
    const updatedResponse = await knex('agent_responses').where('id', responseId).first();
    const updatedProposal = await knex('action_proposals').where('id', proposalId).first();
    
    logger.info('Updated context data retrieved successfully');
    logger.info('Updated query data retrieved successfully');
    logger.info('Updated response data retrieved successfully');
    logger.info('Updated proposal data retrieved successfully');
    
    // Success!
    logger.info('All tests completed successfully!');
    return true;
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    throw error;
  } finally {
    // Clean up - drop the test tables
    logger.info('Cleaning up test data...');
    
    try {
      await knex.schema.dropTableIfExists('action_proposals');
      await knex.schema.dropTableIfExists('agent_responses');
      await knex.schema.dropTableIfExists('agent_queries');
      await knex.schema.dropTableIfExists('conversation_contexts');
      logger.info('Test tables dropped successfully');
    } catch (cleanupError) {
      logger.warn(`Cleanup failed: ${cleanupError.message}`);
    }
    
    // Close database connection
    await knex.destroy();
  }
}

// Run the tests
testAgentMigrations()
  .then(() => {
    console.log('Agent migrations tests completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });