/**
 * Action Model
 * 
 * Represents an individual action that is part of a decision,
 * including its parameters, execution status, and results.
 */

const { Model } = require('objection');
const Decision = require('./Decision');

class Action extends Model {
  static get tableName() {
    return 'actions';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['decision_id', 'type', 'domain', 'parameters', 'status', 'execution_order'],
      
      properties: {
        id: { type: 'string', format: 'uuid' },
        decision_id: { type: 'string', format: 'uuid' },
        type: { type: 'string', maxLength: 50 },
        domain: { type: 'string', maxLength: 50 },
        description: { type: 'string' },
        parameters: { type: 'object' },
        status: { 
          type: 'string', 
          enum: ['PENDING', 'EXECUTING', 'COMPLETED', 'FAILED'] 
        },
        execution_order: { type: 'integer', minimum: 0 },
        started_at: { type: 'string', format: 'date-time' },
        completed_at: { type: 'string', format: 'date-time' },
        result: { type: 'object' },
        retry_policy: { 
          type: 'object',
          properties: {
            maxRetries: { type: 'integer', minimum: 0 },
            retryCount: { type: 'integer', minimum: 0 },
            retryDelay: { type: 'integer', minimum: 0 }
          }
        },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      decision: {
        relation: Model.BelongsToOneRelation,
        modelClass: Decision,
        join: {
          from: 'actions.decision_id',
          to: 'decisions.id'
        }
      },
      dependencies: {
        relation: Model.ManyToManyRelation,
        modelClass: Action,
        join: {
          from: 'actions.id',
          through: {
            from: 'action_dependencies.dependent_action_id',
            to: 'action_dependencies.dependency_action_id',
            extra: ['dependency_type']
          },
          to: 'actions.id'
        }
      },
      dependents: {
        relation: Model.ManyToManyRelation,
        modelClass: Action,
        join: {
          from: 'actions.id',
          through: {
            from: 'action_dependencies.dependency_action_id',
            to: 'action_dependencies.dependent_action_id',
            extra: ['dependency_type']
          },
          to: 'actions.id'
        }
      }
    };
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    
    // Initialize retry policy if not set
    if (!this.retry_policy) {
      this.retry_policy = {
        maxRetries: 3,
        retryCount: 0,
        retryDelay: 1000
      };
    }
  }

  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);
    this.updated_at = new Date().toISOString();
    
    // Set status timestamps
    if (opt.old && opt.old.status !== this.status) {
      if (this.status === 'EXECUTING' && !this.started_at) {
        this.started_at = new Date().toISOString();
      } else if ((this.status === 'COMPLETED' || this.status === 'FAILED') && !this.completed_at) {
        this.completed_at = new Date().toISOString();
      }
    }
  }

  // Helper method to check if the action can be executed
  async canExecute() {
    // An action can be executed if it's pending and all dependencies are completed
    if (this.status !== 'PENDING') {
      return false;
    }

    // Check dependencies
    const dependencies = await this.$relatedQuery('dependencies');
    for (const dependency of dependencies) {
      if (dependency.status !== 'COMPLETED') {
        return false;
      }
    }

    return true;
  }

  // Helper method to mark action as executing
  async startExecution() {
    return this.$query().patch({
      status: 'EXECUTING',
      started_at: new Date().toISOString()
    });
  }

  // Helper method to mark action as completed
  async completeExecution(result) {
    return this.$query().patch({
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      result
    });
  }

  // Helper method to mark action as failed
  async failExecution(error) {
    return this.$query().patch({
      status: 'FAILED',
      completed_at: new Date().toISOString(),
      result: { error: error.message || String(error) }
    });
  }

  // Helper method to handle retries
  async retry() {
    const { maxRetries, retryCount, retryDelay } = this.retry_policy;
    
    if (retryCount >= maxRetries) {
      return false;
    }
    
    await this.$query().patch({
      status: 'PENDING',
      retry_policy: {
        ...this.retry_policy,
        retryCount: retryCount + 1
      }
    });
    
    return true;
  }
}

// Fix circular dependency issue
Action.relationMappings.decision.modelClass = require('./Decision');

module.exports = Action;