/**
 * Migration to create tables for collaboration features
 */

exports.up = function(knex) {
  return Promise.all([
    // Workspaces table
    knex.schema.createTable('workspaces', table => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.text('description');
      table.jsonb('content');
      table.string('status').defaultTo('active');
      table.string('visibility').defaultTo('private');
      table.jsonb('settings');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('created_by').notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.string('updated_by');
    }),
    
    // Workspace members table
    knex.schema.createTable('workspace_members', table => {
      table.uuid('workspace_id').notNullable();
      table.string('user_id').notNullable();
      table.string('role').defaultTo('member');
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.primary(['workspace_id', 'user_id']);
      table.foreign('workspace_id').references('workspaces.id').onDelete('CASCADE');
    }),
    
    // Comments table
    knex.schema.createTable('comments', table => {
      table.uuid('id').primary();
      table.uuid('workspace_id').notNullable();
      table.string('target_type').notNullable();
      table.string('target_id').notNullable();
      table.string('author').notNullable();
      table.text('text').notNullable();
      table.jsonb('attachments');
      table.string('visibility').defaultTo('all_members');
      table.boolean('is_edited').defaultTo(false);
      table.uuid('parent_comment_id');
      table.jsonb('metadata');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.foreign('workspace_id').references('workspaces.id').onDelete('CASCADE');
      table.foreign('parent_comment_id').references('comments.id').onDelete('SET NULL');
    }),
    
    // Comment reactions table
    knex.schema.createTable('comment_reactions', table => {
      table.uuid('comment_id').notNullable();
      table.string('user_id').notNullable();
      table.string('reaction').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.primary(['comment_id', 'user_id', 'reaction']);
      table.foreign('comment_id').references('comments.id').onDelete('CASCADE');
    }),
    
    // Annotations table
    knex.schema.createTable('annotations', table => {
      table.uuid('id').primary();
      table.uuid('workspace_id').notNullable();
      table.string('target_type').notNullable();
      table.string('target_id').notNullable();
      table.string('author').notNullable();
      table.text('text').notNullable();
      table.jsonb('position').notNullable();
      table.jsonb('style');
      table.string('visibility').defaultTo('all_members');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.foreign('workspace_id').references('workspaces.id').onDelete('CASCADE');
    }),
    
    // Activity table
    knex.schema.createTable('activities', table => {
      table.uuid('id').primary();
      table.uuid('workspace_id').notNullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      table.string('user_id').notNullable();
      table.string('activity_type').notNullable();
      table.string('target_type');
      table.string('target_id');
      table.string('summary');
      table.string('reference_id');
      table.foreign('workspace_id').references('workspaces.id').onDelete('CASCADE');
    }),
    
    // Proactive insights table
    knex.schema.createTable('proactive_insights', table => {
      table.uuid('id').primary();
      table.string('title').notNullable();
      table.text('description').notNullable();
      table.string('category').notNullable();
      table.string('priority').notNullable();
      table.float('confidence');
      table.string('status').defaultTo('new');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.jsonb('affected_assets');
      table.jsonb('time_range');
      table.jsonb('metrics');
      table.jsonb('recommended_actions');
      table.jsonb('visualization_options');
      table.string('updated_by');
      table.timestamp('updated_at');
      table.string('assigned_to');
      table.text('comment');
    }),
    
    // Feedback table
    knex.schema.createTable('feedback', table => {
      table.uuid('id').primary();
      table.timestamp('received_at').defaultTo(knex.fn.now());
      table.string('target_type').notNullable();
      table.string('target_id').notNullable();
      table.string('user_id').notNullable();
      table.integer('rating').notNullable();
      table.text('feedback_text');
      table.string('outcome_status');
      table.text('outcome_notes');
      table.jsonb('metadata');
      table.string('source').defaultTo('user_explicit');
      table.boolean('processed').defaultTo(false);
      table.timestamp('processed_at');
      table.text('processing_error');
    }),
    
    // Experiments table
    knex.schema.createTable('experiments', table => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.text('description');
      table.string('status').defaultTo('active');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('start_date').defaultTo(knex.fn.now());
      table.timestamp('end_date');
      table.string('target_type').notNullable();
      table.jsonb('variants').notNullable();
      table.jsonb('traffic_allocation');
      table.string('success_metric').defaultTo('avgRating');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('experiments'),
    knex.schema.dropTableIfExists('feedback'),
    knex.schema.dropTableIfExists('proactive_insights'),
    knex.schema.dropTableIfExists('activities'),
    knex.schema.dropTableIfExists('annotations'),
    knex.schema.dropTableIfExists('comment_reactions'),
    knex.schema.dropTableIfExists('comments'),
    knex.schema.dropTableIfExists('workspace_members'),
    knex.schema.dropTableIfExists('workspaces')
  ]);
};