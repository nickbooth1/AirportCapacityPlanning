/**
 * Script to create or recreate the agent-related tables to match the models
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Creating or updating agent-related tables...');
    
    // 1. Create/update conversation_contexts table
    await updateConversationContextsTable();
    
    // 2. Create/update agent_queries table
    await updateAgentQueriesTable();
    
    // 3. Create/update agent_responses table
    await updateAgentResponsesTable();
    
    // 4. Create/update action_proposals table
    await updateActionProposalsTable();
    
    logger.info('All agent tables successfully created or updated!');
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    throw error;
  } finally {
    // Close database connection
    await knex.destroy();
  }
}

/**
 * Update the conversation_contexts table
 */
async function updateConversationContextsTable() {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable('conversation_contexts');
  
  if (tableExists) {
    logger.info('Dropping existing conversation_contexts table...');
    await knex.schema.dropTable('conversation_contexts');
  }
  
  logger.info('Creating conversation_contexts table...');
  
  // Create the conversation_contexts table with correct schema
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
  
  logger.info('conversation_contexts table created successfully');
}

/**
 * Update the agent_queries table
 */
async function updateAgentQueriesTable() {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable('agent_queries');
  
  if (tableExists) {
    logger.info('Dropping existing agent_queries table...');
    await knex.schema.dropTable('agent_queries');
  }
  
  logger.info('Creating agent_queries table...');
  
  // Create the agent_queries table with correct schema
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
    
    // Add index for quick lookup
    table.index(['contextId']);
  });
  
  logger.info('agent_queries table created successfully');
}

/**
 * Update the agent_responses table
 */
async function updateAgentResponsesTable() {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable('agent_responses');
  
  if (tableExists) {
    logger.info('Dropping existing agent_responses table...');
    await knex.schema.dropTable('agent_responses');
  }
  
  logger.info('Creating agent_responses table...');
  
  // Create the agent_responses table with correct schema
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
    
    // Add indexes for quick lookup
    table.index(['contextId']);
    table.index(['queryId']);
  });
  
  logger.info('agent_responses table created successfully');
}

/**
 * Update the action_proposals table
 */
async function updateActionProposalsTable() {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable('action_proposals');
  
  if (tableExists) {
    logger.info('Dropping existing action_proposals table...');
    await knex.schema.dropTable('action_proposals');
  }
  
  logger.info('Creating action_proposals table...');
  
  // Create the action_proposals table with correct schema
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
    
    // Add indexes for quick lookup
    table.index(['contextId']);
    table.index(['userId']);
    table.index(['status']);
  });
  
  logger.info('action_proposals table created successfully');
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });