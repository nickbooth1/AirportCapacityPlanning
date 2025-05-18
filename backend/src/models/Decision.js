/**
 * Decision Model
 * 
 * Represents a decision made by the autonomous system,
 * including its status, impact assessment, and associated actions.
 */

const { Model } = require('objection');
const Action = require('./Action');
const OperatingMode = require('./OperatingMode');

class Decision extends Model {
  static get tableName() {
    return 'decisions';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['type', 'status', 'priority', 'confidence', 'risk', 'impact_assessment'],
      
      properties: {
        id: { type: 'string', format: 'uuid' },
        type: { type: 'string', maxLength: 50 },
        description: { type: 'string' },
        initiated_at: { type: 'string', format: 'date-time' },
        completed_at: { type: 'string', format: 'date-time' },
        status: { 
          type: 'string', 
          enum: [
            'PROPOSED', 'APPROVED', 'EXECUTING', 
            'COMPLETED', 'FAILED', 'CANCELED'
          ]
        },
        priority: { 
          type: 'string', 
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] 
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        risk: { type: 'number', minimum: 0, maximum: 1 },
        impact_assessment: {
          type: 'object',
          required: ['operationalImpact', 'passengerImpact', 'sustainabilityImpact', 'commercialImpact'],
          properties: {
            operationalImpact: { type: 'object' },
            passengerImpact: { type: 'object' },
            sustainabilityImpact: { type: 'object' },
            commercialImpact: { type: 'object' }
          }
        },
        domain_details: { type: 'object' },
        operating_mode_id: { type: ['string', 'null'], format: 'uuid' },
        correlation_id: { type: ['string', 'null'], format: 'uuid' },
        requested_by: { type: ['string', 'null'], maxLength: 100 },
        tags: { type: 'array', items: { type: 'string' } },
        notes: { type: 'array', items: { type: 'string' } },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      actions: {
        relation: Model.HasManyRelation,
        modelClass: Action,
        join: {
          from: 'decisions.id',
          to: 'actions.decision_id'
        }
      },
      operatingMode: {
        relation: Model.BelongsToOneRelation,
        modelClass: OperatingMode,
        join: {
          from: 'decisions.operating_mode_id',
          to: 'operating_modes.id'
        }
      },
      dependencies: {
        relation: Model.ManyToManyRelation,
        modelClass: Decision,
        join: {
          from: 'decisions.id',
          through: {
            from: 'decision_dependencies.dependent_decision_id',
            to: 'decision_dependencies.dependency_decision_id',
            extra: ['dependency_type']
          },
          to: 'decisions.id'
        }
      },
      dependents: {
        relation: Model.ManyToManyRelation,
        modelClass: Decision,
        join: {
          from: 'decisions.id',
          through: {
            from: 'decision_dependencies.dependency_decision_id',
            to: 'decision_dependencies.dependent_decision_id',
            extra: ['dependency_type']
          },
          to: 'decisions.id'
        }
      }
    };
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this.initiated_at = this.initiated_at || new Date().toISOString();
  }

  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);
    this.updated_at = new Date().toISOString();
  }

  // Helper method to check if decision can be executed
  async canExecute() {
    // A decision can be executed if it's approved and all dependencies are completed
    if (this.status !== 'APPROVED') {
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

  // Helper method to get execution progress
  async getExecutionProgress() {
    const actions = await this.$relatedQuery('actions').orderBy('execution_order');
    if (!actions.length) {
      return 0;
    }

    const completedActions = actions.filter(a => a.status === 'COMPLETED');
    return (completedActions.length / actions.length) * 100;
  }
}

module.exports = Decision;