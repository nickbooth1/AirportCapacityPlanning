/**
 * Operating Mode Model
 * 
 * Represents a configuration for system behavior, determining
 * how the autonomous system balances different priorities and
 * makes decisions.
 */

const { Model } = require('objection');

class OperatingMode extends Model {
  static get tableName() {
    return 'operating_modes';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'priority_weights', 'decision_thresholds'],
      
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string' },
        priority_weights: {
          type: 'object',
          required: ['operationalEfficiency', 'passengerExperience', 'sustainability', 'commercialPerformance'],
          properties: {
            operationalEfficiency: { type: 'number', minimum: 0, maximum: 1 },
            passengerExperience: { type: 'number', minimum: 0, maximum: 1 },
            sustainability: { type: 'number', minimum: 0, maximum: 1 },
            commercialPerformance: { type: 'number', minimum: 0, maximum: 1 }
          }
        },
        decision_thresholds: {
          type: 'object',
          required: ['requiredConfidenceScore', 'maxAcceptableRisk'],
          properties: {
            requiredConfidenceScore: { type: 'number', minimum: 0, maximum: 1 },
            maxAcceptableRisk: { type: 'number', minimum: 0, maximum: 1 },
            capacityMinimumScore: { type: 'number', minimum: 0, maximum: 1 },
            passengerMinimumScore: { type: 'number', minimum: 0, maximum: 1 },
            sustainabilityMinimumScore: { type: 'number', minimum: 0, maximum: 1 },
            commercialMinimumScore: { type: 'number', minimum: 0, maximum: 1 }
          }
        },
        activation_criteria: {
          type: 'object',
          properties: {
            timeBasedTriggers: { type: 'array', items: { type: 'string' } },
            eventBasedTriggers: { type: 'array', items: { type: 'string' } },
            manualActivation: { type: 'boolean' }
          }
        },
        constraints: { type: 'object' },
        is_active: { type: 'boolean' },
        version: { type: 'integer', minimum: 1 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        created_by: { type: 'string', maxLength: 100 },
        updated_by: { type: 'string', maxLength: 100 }
      }
    };
  }

  static get relationMappings() {
    return {
      // Define relationships here if needed
    };
  }

  // Validate that priority weights sum to 1
  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this._validatePriorityWeights();
  }

  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);
    this._validatePriorityWeights();
    this.updated_at = new Date().toISOString();
    this.version += 1;
  }

  _validatePriorityWeights() {
    if (this.priority_weights) {
      const { operationalEfficiency, passengerExperience, sustainability, commercialPerformance } = this.priority_weights;
      const sum = operationalEfficiency + passengerExperience + sustainability + commercialPerformance;
      
      // Allow a small error margin due to floating point arithmetic
      if (Math.abs(sum - 1) > 0.001) {
        throw new Error('Priority weights must sum to 1');
      }
    }
  }
}

module.exports = OperatingMode;