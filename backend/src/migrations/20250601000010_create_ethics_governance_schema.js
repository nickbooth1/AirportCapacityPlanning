/**
 * Migration: Create Ethics & Governance Schema
 * 
 * This migration creates tables for the Ethics & Governance component
 * of the Autonomous Airport Platform, supporting ethical principles,
 * governance policies, decision audits, and fairness metrics.
 */

exports.up = function(knex) {
  return knex.schema
    // Ethical principles table
    .createTable('ethical_principles', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 100).notNullable();
      table.text('description').notNullable();
      table.integer('priority');
      table.string('category', 50);
      table.jsonb('implementation_rules');
      table.jsonb('metrics');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.integer('version').notNullable().defaultTo(1);
      table.boolean('is_active').defaultTo(true);
      
      // Indexes for principle queries
      table.index('is_active', 'idx_ethical_principles_active');
      table.index('category', 'idx_ethical_principles_category');
    })
    
    // Governance policies table
    .createTable('governance_policies', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('policy_type', 50).notNullable();
      table.string('name', 100).notNullable();
      table.text('description');
      table.jsonb('policy_rules').notNullable();
      table.specificType('affected_domains', 'text[]');
      table.string('implementation_level', 20).notNullable();
      table.jsonb('override_conditions');
      table.jsonb('audit_requirements');
      table.string('created_by', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.integer('version').notNullable().defaultTo(1);
      table.boolean('is_active').defaultTo(true);
      
      // Indexes for policy queries
      table.index('is_active', 'idx_governance_policies_active');
      table.index('policy_type', 'idx_governance_policies_type');
    })
    
    // Decision audits table
    .createTable('decision_audits', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('decision_id').notNullable();
      table.timestamp('timestamp').notNullable();
      table.string('audit_type', 50).notNullable();
      table.string('audited_by', 100);
      table.string('compliance_status', 20).notNullable();
      table.jsonb('ethical_assessment');
      table.jsonb('governance_assessment');
      table.text('recommendations');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for audit queries
      table.index('decision_id', 'idx_decision_audits_decision');
      table.index('timestamp', 'idx_decision_audits_timestamp');
      table.index('compliance_status', 'idx_decision_audits_compliance');
    })
    
    // Fairness metrics table
    .createTable('fairness_metrics', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.timestamp('timestamp').notNullable();
      table.string('metric_type', 50).notNullable();
      table.string('domain', 50);
      table.string('affected_group', 100);
      table.decimal('value', 10, 4).notNullable();
      table.decimal('baseline_comparison', 10, 4);
      table.string('threshold_status', 20);
      table.integer('sample_size');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for metrics queries
      table.index('metric_type', 'idx_fairness_metrics_type');
      table.index('domain', 'idx_fairness_metrics_domain');
      table.index('affected_group', 'idx_fairness_metrics_group');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('fairness_metrics')
    .dropTableIfExists('decision_audits')
    .dropTableIfExists('governance_policies')
    .dropTableIfExists('ethical_principles');
};